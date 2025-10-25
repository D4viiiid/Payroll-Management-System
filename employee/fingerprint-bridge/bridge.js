/**
 * 🔐 Fingerprint Bridge Server (HTTPS)
 * 
 * Purpose: Acts as a local bridge between the cloud-deployed web app (Vercel)
 *          and the USB-connected ZKTeco fingerprint scanner
 * 
 * How it works:
 * 1. This server runs on the local machine with the fingerprint scanner
 * 2. The web app (on Vercel) calls https://localhost:3003 (HTTPS!)
 * 3. This server executes Python scripts to access the USB device
 * 4. Results are returned to the web app
 * 
 * HTTPS Mode:
 * - Uses self-signed SSL certificate (cert.pem + key.pem)
 * - Allows HTTPS Vercel app to connect (no Mixed Content blocking)
 * - User accepts certificate warning once (safe for localhost)
 * - Falls back to HTTP if certificates not found
 * 
 * Installation:
 * 1. Install Node.js (https://nodejs.org)
 * 2. Run: npm install
 * 3. Run: node generate-certificate.js (creates SSL cert)
 * 4. Run: npm start
 * 
 * Requirements:
 * - Node.js v14+
 * - Python 3.x with pyzkfp library installed
 * - ZKTeco fingerprint scanner connected via USB
 * - OpenSSL (for certificate generation)
 */

const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// USB Device Auto-Detection
let usbDetection;
try {
  usbDetection = require('usb-detection');
} catch (error) {
  console.warn('⚠️  USB detection not available. Install with: npm install usb-detection');
}

const app = express();

// Enable CORS for all origins (allows Vercel frontend to access this local server)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuration
const PORT = process.env.BRIDGE_PORT || 3003;
// ✅ FIX: Check both possible locations (dev: ../Biometric_connect, prod: ./Biometric_connect)
const PYTHON_SCRIPT_DIR_DEV = path.join(__dirname, '../Biometric_connect');
const PYTHON_SCRIPT_DIR_PROD = path.join(__dirname, 'Biometric_connect');
const PYTHON_SCRIPT_DIR = fs.existsSync(PYTHON_SCRIPT_DIR_PROD) ? PYTHON_SCRIPT_DIR_PROD : PYTHON_SCRIPT_DIR_DEV;
const CAPTURE_SCRIPT = path.join(PYTHON_SCRIPT_DIR, 'capture_fingerprint_ipc_complete.py');
const ENROLLMENT_SCRIPT = path.join(PYTHON_SCRIPT_DIR, 'main.py');

// Device status tracking
let deviceConnected = false;
let lastDeviceCheck = null;
let connectedDevices = [];

// Verify Python scripts exist
const checkScripts = () => {
  const scripts = [CAPTURE_SCRIPT, ENROLLMENT_SCRIPT];
  const missing = scripts.filter(script => !fs.existsSync(script));
  
  if (missing.length > 0) {
    console.error('❌ Missing Python scripts:');
    missing.forEach(script => console.error(`   - ${script}`));
    console.error('\n💡 Please ensure Python scripts are in: employee/Biometric_connect/');
    return false;
  }
  return true;
};

/**
 * Check if ZKTeco device is connected via USB
 * ✅ CRITICAL FIX: Use absolute Python path for Windows Service compatibility
 */
const checkDeviceConnection = async () => {
  console.log('🔍 [DEVICE CHECK] Starting device detection...');
  
  return new Promise((resolve) => {
    // ✅ FIX: Try multiple Python paths (Windows Service compatibility)
    const pythonPaths = [
      'C:\\Python313\\python.exe',  // Direct installation path
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      'python'  // Fallback to PATH
    ];
    
    let pythonPath = 'python';
    
    // Try to find Python executable
    const fs = require('fs');
    for (const path of pythonPaths) {
      if (path === 'python' || fs.existsSync(path)) {
        pythonPath = path;
        break;
      }
    }
    
    console.log(`🐍 [DEVICE CHECK] Using Python: ${pythonPath}`);
    console.log(`📝 [DEVICE CHECK] Command: ${pythonPath} -c "from pyzkfp import ZKFP2; ..."`);
    
    // Try to get device info from Python
    const python = spawn(pythonPath, [
      '-c',
      'from pyzkfp import ZKFP2; zkfp2 = ZKFP2(); zkfp2.Init(); print(zkfp2.GetDeviceCount()); zkfp2.Terminate()'
    ]);
    
    let output = '';
    let errorOutput = '';
    
    python.on('spawn', () => {
      console.log('✅ [DEVICE CHECK] Python process spawned successfully');
    });
    
    python.stdout.on('data', (data) => {
      const stdoutData = data.toString();
      console.log(`📤 [DEVICE CHECK] Python stdout:`, stdoutData.trim());
      output += stdoutData;
    });
    
    python.stderr.on('data', (data) => {
      const stderrData = data.toString();
      console.log(`⚠️  [DEVICE CHECK] Python stderr:`, stderrData.trim());
      errorOutput += stderrData;
    });
    
    python.on('close', (code) => {
      console.log(`🔚 [DEVICE CHECK] Python process closed with code: ${code}`);
      console.log(`📊 [DEVICE CHECK] Output: "${output.trim()}"`);
      console.log(`📊 [DEVICE CHECK] Error output: "${errorOutput.trim()}"`);
      
      if (code === 0 && output.trim()) {
        const deviceCount = parseInt(output.trim());
        deviceConnected = deviceCount > 0;
        lastDeviceCheck = new Date(); // ✅ Update timestamp
        console.log(`✅ [DEVICE CHECK] Device check: ${deviceCount} device(s) found`);
        console.log(`✅ [DEVICE CHECK] lastDeviceCheck set to: ${lastDeviceCheck.toISOString()}`);
        resolve(deviceCount > 0);
      } else {
        deviceConnected = false;
        lastDeviceCheck = new Date(); // ✅ CRITICAL FIX: Update timestamp even on failure!
        console.log(`❌ [DEVICE CHECK] Device check failed`);
        console.log(`✅ [DEVICE CHECK] lastDeviceCheck set to: ${lastDeviceCheck.toISOString()}`);
        if (errorOutput) {
          console.error('❌ [DEVICE CHECK] Python stderr:', errorOutput);
        }
        if (code !== 0) {
          console.error(`❌ [DEVICE CHECK] Python exit code: ${code}`);
        }
        if (!output.trim()) {
          console.error('❌ [DEVICE CHECK] Python returned no output');
        }
        resolve(false);
      }
    });
    
    python.on('error', (error) => {
      console.error('❌ [DEVICE CHECK] Python spawn error:', error.message);
      deviceConnected = false;
      lastDeviceCheck = new Date(); // ✅ CRITICAL FIX: Update timestamp even on error!
      console.log(`✅ [DEVICE CHECK] lastDeviceCheck set to: ${lastDeviceCheck.toISOString()}`);
      resolve(false);
    });
  });
};

/**
 * Initialize USB device monitoring
 */
const initUSBMonitoring = () => {
  if (!usbDetection) {
    console.log('⚠️  USB auto-detection disabled. Device status will be checked per request.');
    return;
  }

  console.log('🔌 Starting USB device monitoring...');
  
  // Start monitoring
  usbDetection.startMonitoring();
  
  // Listen for device insertion
  usbDetection.on('add', async (device) => {
    console.log(`\n🔌 USB Device Connected:`);
    console.log(`   VID: ${device.vendorId}, PID: ${device.productId}`);
    
    // Check if it's a ZKTeco device (you can add specific VID/PID filtering)
    const isConnected = await checkDeviceConnection();
    
    if (isConnected) {
      console.log('✅ ZKTeco fingerprint scanner detected and ready!');
      deviceConnected = true;
      connectedDevices.push(device);
    }
  });
  
  // Listen for device removal
  usbDetection.on('remove', (device) => {
    console.log(`\n🔌 USB Device Disconnected:`);
    console.log(`   VID: ${device.vendorId}, PID: ${device.productId}`);
    
    // Remove from connected devices
    connectedDevices = connectedDevices.filter(
      d => d.vendorId !== device.vendorId || d.productId !== device.productId
    );
    
    // Check if ZKTeco device is still connected
    checkDeviceConnection().then(isConnected => {
      deviceConnected = isConnected;
      if (!isConnected) {
        console.log('⚠️  ZKTeco fingerprint scanner disconnected');
      }
    });
  });
  
  // Initial device check
  checkDeviceConnection().then(isConnected => {
    if (isConnected) {
      console.log('✅ ZKTeco fingerprint scanner detected on startup!');
    } else {
      console.log('⚠️  No ZKTeco fingerprint scanner detected. Please connect the device.');
    }
  });
};

/**
 * Execute Python script and return JSON result
 * ✅ CRITICAL FIX: Use absolute Python path for Windows Service compatibility
 */
const executePython = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    // ✅ FIX: Try multiple Python paths (same logic as checkDeviceConnection)
    const pythonPaths = [
      'C:\\Python313\\python.exe',  // Direct installation path
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      'python'  // Fallback to PATH
    ];
    
    let pythonPath = 'python';
    
    // Try to find Python executable
    for (const path of pythonPaths) {
      if (path === 'python' || fs.existsSync(path)) {
        pythonPath = path;
        break;
      }
    }
    
    console.log(`🐍 Executing: ${pythonPath} ${scriptPath} ${args.join(' ')}`);
    
    const python = spawn(pythonPath, [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('📤', data.toString().trim());
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('❌', data.toString().trim());
    });
    
    python.on('close', (code) => {
      console.log(`✅ Python script exited with code: ${code}`);
      
      if (code === 0) {
        try {
          // Try to parse as JSON
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          // If not JSON, return as plain text
          resolve({
            success: true,
            data: stdout,
            raw: true
          });
        }
      } else {
        reject({
          success: false,
          error: stderr || 'Script execution failed',
          code: code
        });
      }
    });
    
    python.on('error', (error) => {
      console.error('❌ Python execution error:', error);
      reject({
        success: false,
        error: error.message
      });
    });
  });
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/health
 * Health check endpoint - verify bridge server is running
 */
app.get('/api/health', async (req, res) => {
  //✅ CRITICAL FIX: Always check device on health endpoint
  try {
    const isConnected = await checkDeviceConnection();
    
    res.json({
      success: true,
      message: '✅ Fingerprint Bridge Server is running',
      deviceConnected: isConnected,
      deviceStatus: isConnected ? 'connected' : 'disconnected',
      lastCheck: lastDeviceCheck,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      scriptsFound: checkScripts(),
      usbMonitoring: !!usbDetection
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.json({
      success: true,
      message: '✅ Fingerprint Bridge Server is running',
      deviceConnected: false,
      deviceStatus: 'error',
      error: error.message,
      lastCheck: lastDeviceCheck,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      scriptsFound: checkScripts(),
      usbMonitoring: !!usbDetection
    });
  }
});

/**
 * GET /api/device/status
 * Get detailed device status
 */
app.get('/api/device/status', async (req, res) => {
  const isConnected = await checkDeviceConnection();
  
  res.json({
    success: true,
    connected: isConnected,
    status: isConnected ? 'ready' : 'disconnected',
    message: isConnected 
      ? 'ZKTeco device is connected and ready'
      : 'No ZKTeco device detected. Please connect the USB scanner.',
    lastCheck: lastDeviceCheck,
    connectedDevicesCount: connectedDevices.length
  });
});

/**
 * POST /api/fingerprint/capture
 * Capture a single fingerprint (for attendance/verification)
 */
app.post('/api/fingerprint/capture', async (req, res) => {
  try {
    console.log('\n👆 === FINGERPRINT CAPTURE REQUEST ===');
    
    const result = await executePython(CAPTURE_SCRIPT, ['--direct']);
    
    console.log('✅ Fingerprint captured successfully');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Fingerprint capture failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fingerprint capture failed',
      error: error.error || error.message
    });
  }
});

/**
 * POST /api/fingerprint/login
 * Capture fingerprint and verify against database for login
 */
app.post('/api/fingerprint/login', async (req, res) => {
  try {
    console.log('\n🔐 === FINGERPRINT LOGIN REQUEST ===');
    
    const result = await executePython(CAPTURE_SCRIPT, ['--login']);
    
    if (result.success && result.employee) {
      console.log(`✅ Login successful for: ${result.employee.firstName} ${result.employee.lastName}`);
    } else {
      console.log('❌ Fingerprint not recognized');
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Fingerprint login failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fingerprint login failed',
      error: error.error || error.message
    });
  }
});

/**
 * POST /api/fingerprint/enroll
 * Enroll a new fingerprint (3 scans + merge)
 * 
 * Body: { employeeId, firstName, lastName, email }
 */
app.post('/api/fingerprint/enroll', async (req, res) => {
  try {
    console.log('\n📝 === FINGERPRINT ENROLLMENT REQUEST ===');
    
    const { employeeId, firstName, lastName, email } = req.body;
    
    if (!employeeId || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, firstName, lastName'
      });
    }
    
    console.log(`📋 Employee: ${firstName} ${lastName} (ID: ${employeeId})`);
    
    // Pass employee data as JSON argument to Python script
    const employeeData = JSON.stringify({
      _id: employeeId,
      firstName,
      lastName,
      email
    });
    
    const result = await executePython(ENROLLMENT_SCRIPT, ['--data', employeeData]);
    
    if (result.success) {
      console.log('✅ Fingerprint enrollment completed successfully');
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Fingerprint enrollment failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fingerprint enrollment failed',
      error: error.error || error.message
    });
  }
});

/**
 * POST /api/fingerprint/verify
 * Verify a captured fingerprint against a stored template
 * 
 * Body: { fingerprintTemplate }
 */
app.post('/api/fingerprint/verify', async (req, res) => {
  try {
    console.log('\n🔍 === FINGERPRINT VERIFICATION REQUEST ===');
    
    const { fingerprintTemplate } = req.body;
    
    if (!fingerprintTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Missing fingerprintTemplate in request body'
      });
    }
    
    // This would need a Python script that accepts a template and verifies
    // For now, we'll use the login script which queries the database
    const result = await executePython(CAPTURE_SCRIPT, ['--verify', fingerprintTemplate]);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Fingerprint verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fingerprint verification failed',
      error: error.error || error.message
    });
  }
});

/**
 * POST /api/attendance/record
 * Capture fingerprint and record attendance directly
 */
app.post('/api/attendance/record', async (req, res) => {
  try {
    console.log('\n📝 === ATTENDANCE RECORDING REQUEST ===');
    
    // Use the direct mode which records attendance in database
    const result = await executePython(CAPTURE_SCRIPT, ['--direct']);
    
    if (result.success) {
      console.log('✅ Attendance recorded successfully');
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Attendance recording failed:', error);
    res.status(500).json({
      success: false,
      message: 'Attendance recording failed',
      error: error.error || error.message
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET  /api/health',
      'POST /api/fingerprint/capture',
      'POST /api/fingerprint/login',
      'POST /api/fingerprint/enroll',
      'POST /api/fingerprint/verify',
      'POST /api/attendance/record'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

// Check Python scripts before starting
if (!checkScripts()) {
  console.error('\n⚠️  WARNING: Some Python scripts are missing!');
  console.error('The server will start but fingerprint operations may fail.\n');
}

// ✅ HTTPS SUPPORT: Check for SSL certificates
const SSL_CERT_PATH = path.join(__dirname, 'cert.pem');
const SSL_KEY_PATH = path.join(__dirname, 'key.pem');
const hasSSL = fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH);

let server;

if (hasSSL) {
  // ✅ HTTPS MODE: Create HTTPS server with SSL certificates
  console.log('\n🔒 SSL certificates found - starting HTTPS server...\n');
  
  const httpsOptions = {
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH)
  };
  
  server = https.createServer(httpsOptions, app);
  
  server.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 FINGERPRINT BRIDGE SERVER v2.0 (HTTPS MODE)');
    console.log('='.repeat(70));
    console.log(`✅ Server running on: https://localhost:${PORT}`);
    console.log(`� SSL Certificate: ${path.basename(SSL_CERT_PATH)}`);
    console.log(`🔑 SSL Private Key: ${path.basename(SSL_KEY_PATH)}`);
    console.log(`�📁 Python scripts directory: ${PYTHON_SCRIPT_DIR}`);
    console.log(`🐍 Capture script: ${path.basename(CAPTURE_SCRIPT)}`);
    console.log(`🐍 Enrollment script: ${path.basename(ENROLLMENT_SCRIPT)}`);
    console.log('\n📋 Available endpoints:');
    console.log('   GET  /api/health                 - Health check + device status');
    console.log('   GET  /api/device/status          - Detailed device status');
    console.log('   POST /api/fingerprint/capture    - Capture fingerprint');
    console.log('   POST /api/fingerprint/login      - Login with fingerprint');
    console.log('   POST /api/fingerprint/enroll     - Enroll new fingerprint');
    console.log('   POST /api/fingerprint/verify     - Verify fingerprint');
    console.log('   POST /api/attendance/record      - Record attendance');
    console.log('\n💡 Features:');
    console.log('   🔌 Auto USB device detection');
    console.log('   🚀 Can run as Windows Service (auto-start on boot)');
    console.log('   🌐 CORS enabled for all origins (works with Vercel)');
    console.log('   ⚡ Plug-and-play - just connect ZKTeco device');
    console.log('   🔒 HTTPS enabled - works from Vercel production!');
    console.log('\n⚠️  FIRST TIME SETUP:');
    console.log('   When accessing https://localhost:3003 from browser:');
    console.log('   1. Browser shows "Not Secure" warning (self-signed cert)');
    console.log('   2. Click "Advanced" → "Proceed to localhost (unsafe)"');
    console.log('   3. This is SAFE - it\'s your own computer!');
    console.log('   4. Browser remembers - no warning on future visits');
    console.log('\n📦 To install as Windows Service:');
    console.log('   Run: INSTALL_AUTO_SERVICE.bat (as Administrator)');
    console.log('🔌 USB Monitoring: ' + (usbDetection ? '✅ Active' : '⚠️  Disabled (install usb-detection)'));
    console.log('='.repeat(70) + '\n');
    
    // Initialize USB monitoring
    initUSBMonitoring();
    
    // ✅ CRITICAL FIX: Check device connection on startup (AWAIT to ensure it completes)
    console.log('🔍 Checking for connected fingerprint devices...');
    
    // Run device check immediately and wait for it
    (async () => {
      try {
        const isConnected = await checkDeviceConnection();
        if (isConnected) {
          console.log('✅ ZKTeco fingerprint scanner detected and ready!');
        } else {
          console.log('⚠️  No fingerprint scanner detected. Please connect your ZKTeco device.');
        }
      } catch (error) {
        console.error('❌ Device check error:', error);
      }
    })();
  });
  
} else {
  // ⚠️  HTTP FALLBACK: No SSL certificates found
  console.log('\n⚠️  SSL certificates not found - starting HTTP server...\n');
  console.log('💡 To enable HTTPS (required for Vercel connection):');
  console.log('   Run: node generate-certificate.js\n');
  
  server = http.createServer(app);
  
  server.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 FINGERPRINT BRIDGE SERVER v2.0 (HTTP MODE)');
    console.log('='.repeat(70));
    console.log(`⚠️  Server running on: http://localhost:${PORT}`);
    console.log(`❌ HTTPS not enabled - Vercel app cannot connect!`);
    console.log(`📁 Python scripts directory: ${PYTHON_SCRIPT_DIR}`);
    console.log(`🐍 Capture script: ${path.basename(CAPTURE_SCRIPT)}`);
    console.log(`🐍 Enrollment script: ${path.basename(ENROLLMENT_SCRIPT)}`);
    console.log('\n📋 Available endpoints:');
    console.log('   GET  /api/health                 - Health check + device status');
    console.log('   GET  /api/device/status          - Detailed device status');
    console.log('   POST /api/fingerprint/capture    - Capture fingerprint');
    console.log('   POST /api/fingerprint/login      - Login with fingerprint');
    console.log('   POST /api/fingerprint/enroll     - Enroll new fingerprint');
    console.log('   POST /api/fingerprint/verify     - Verify fingerprint');
    console.log('   POST /api/attendance/record      - Record attendance');
    console.log('\n💡 Features:');
    console.log('   🔌 Auto USB device detection');
    console.log('   🚀 Can run as Windows Service (auto-start on boot)');
    console.log('   🌐 CORS enabled for all origins');
    console.log('   ⚡ Plug-and-play - just connect ZKTeco device');
    console.log('\n📦 To install as Windows Service:');
    console.log('   Run: INSTALL_AUTO_SERVICE.bat (as Administrator)');
    console.log('🔌 USB Monitoring: ' + (usbDetection ? '✅ Active' : '⚠️  Disabled (install usb-detection)'));
    console.log('='.repeat(70) + '\n');
    
    // Initialize USB monitoring
    initUSBMonitoring();
    
    // ✅ CRITICAL FIX: Check device connection on startup (AWAIT to ensure it completes)
    console.log('🔍 Checking for connected fingerprint devices...');
    
    // Run device check immediately and wait for it
    (async () => {
      try {
        const isConnected = await checkDeviceConnection();
        if (isConnected) {
          console.log('✅ ZKTeco fingerprint scanner detected and ready!');
        } else {
          console.log('⚠️  No fingerprint scanner detected. Please connect your ZKTeco device.');
        }
      } catch (error) {
        console.error('❌ Device check error:', error);
      }
    })();
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Fingerprint Bridge Server...');
  
  if (usbDetection) {
    console.log('🔌 Stopping USB monitoring...');
    usbDetection.stopMonitoring();
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Received SIGTERM, shutting down gracefully...');
  
  if (usbDetection) {
    usbDetection.stopMonitoring();
  }
  
  process.exit(0);
});
