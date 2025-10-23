/**
 * 🔐 Fingerprint Bridge Server
 * 
 * Purpose: Acts as a local bridge between the cloud-deployed web app (Vercel)
 *          and the USB-connected ZKTeco fingerprint scanner
 * 
 * How it works:
 * 1. This server runs on the local machine with the fingerprint scanner
 * 2. The web app (on Vercel) calls http://localhost:3001 
 * 3. This server executes Python scripts to access the USB device
 * 4. Results are returned to the web app
 * 
 * Installation:
 * 1. Install Node.js (https://nodejs.org)
 * 2. Run: npm install
 * 3. Run: npm start
 * 
 * Requirements:
 * - Node.js v14+
 * - Python 3.x with pyzkfp library installed
 * - ZKTeco fingerprint scanner connected via USB
 */

const express = require('express');
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
const PYTHON_SCRIPT_DIR = path.join(__dirname, '../Biometric_connect');
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
 */
const checkDeviceConnection = async () => {
  return new Promise((resolve) => {
    // Try to get device info from Python
    const python = spawn('python', [
      '-c',
      'from pyzkfp import ZKFP2; zkfp2 = ZKFP2(); zkfp2.Init(); print(zkfp2.GetDeviceCount())'
    ]);
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        const deviceCount = parseInt(output.trim());
        deviceConnected = deviceCount > 0;
        lastDeviceCheck = new Date();
        resolve(deviceCount > 0);
      } else {
        deviceConnected = false;
        resolve(false);
      }
    });
    
    python.on('error', () => {
      deviceConnected = false;
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
 */
const executePython = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    console.log(`🐍 Executing: python ${scriptPath} ${args.join(' ')}`);
    
    const python = spawn('python', [scriptPath, ...args]);
    
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
  // Re-check device connection on health check
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

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 FINGERPRINT BRIDGE SERVER v2.0');
  console.log('='.repeat(70));
  console.log(`✅ Server running on: http://localhost:${PORT}`);
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
  console.log('   🌐 CORS enabled for all origins (works with Vercel)');
  console.log('   ⚡ Plug-and-play - just connect ZKTeco device');
  console.log('\n📦 To install as Windows Service:');
  console.log('   Run: INSTALL_AUTO_SERVICE.bat (as Administrator)');
  console.log('\n🔌 USB Monitoring: ' + (usbDetection ? '✅ Active' : '⚠️  Disabled (install usb-detection)'));
  console.log('='.repeat(70) + '\n');
  
  // Initialize USB monitoring
  initUSBMonitoring();
});

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
