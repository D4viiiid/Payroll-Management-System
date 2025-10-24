/**
 * Fingerprint Bridge Installer Routes
 * 
 * Provides endpoints to:
 * 1. Download fingerprint bridge installer
 * 2. Check local bridge connection status
 * 3. Provide installation instructions
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import archiver from 'archiver';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to fingerprint-bridge directory
// payroll-backend/routes/ -> employee/fingerprint-bridge/
const BRIDGE_DIR = path.join(__dirname, '../../fingerprint-bridge');

/**
 * GET /api/fingerprint-bridge/status
 * Check if local bridge server is running
 */
router.get('/status', async (req, res) => {
  try {
    // This endpoint just returns instructions
    // The actual status check happens on the frontend by calling localhost:3003
    res.json({
      success: true,
      message: 'To check bridge status, call http://localhost:3003/api/health from your browser',
      localBridgeURL: 'http://localhost:3003',
      downloadURL: '/api/fingerprint-bridge/download',
      instructions: [
        '1. Download the fingerprint bridge installer',
        '2. Extract the ZIP file',
        '3. Right-click INSTALL_AUTO_SERVICE.bat and "Run as Administrator"',
        '4. Connect your ZKTeco fingerprint scanner via USB',
        '5. Refresh this page to verify connection'
      ]
    });
  } catch (error) {
    console.error('Error getting bridge status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bridge status',
      error: error.message
    });
  }
});

/**
 * GET /api/fingerprint-bridge/download
 * Download fingerprint bridge installer as ZIP
 */
router.get('/download', async (req, res) => {
  try {
    // Check if bridge directory exists
    if (!fs.existsSync(BRIDGE_DIR)) {
      return res.status(404).json({
        success: false,
        message: 'Fingerprint bridge files not found on server'
      });
    }

    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=fingerprint-bridge-installer.zip');

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to create archive',
        error: err.message
      });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add files to archive
    const files = [
      'bridge.js',
      'package.json',
      'install-service.js',
      'uninstall-service.js',
      'INSTALL_AUTO_SERVICE.bat',
      'UNINSTALL_SERVICE.bat',
      'START_BRIDGE.bat',
      'README.md'
    ];

    files.forEach(file => {
      const filePath = path.join(BRIDGE_DIR, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `fingerprint-bridge/${file}` });
      }
    });

    // Add installation instructions
    const installInstructions = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    FINGERPRINT BRIDGE INSTALLER                            ║
║                         Quick Start Guide                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

📋 PREREQUISITES:
   ✓ Windows 7 or later
   ✓ Node.js v14 or later (Download: https://nodejs.org)
   ✓ Python 3.7+ with pyzkfp library installed
   ✓ ZKTeco fingerprint scanner (USB)
   ✓ Administrator privileges

📦 INSTALLATION STEPS:

   1. Extract this ZIP file to a permanent location
      (e.g., C:\\fingerprint-bridge)

   2. Connect your ZKTeco fingerprint scanner via USB

   3. Right-click "INSTALL_AUTO_SERVICE.bat"
      and select "Run as Administrator"

   4. Wait for installation to complete
      (The service will start automatically)

   5. Verify installation:
      - Open browser
      - Visit: http://localhost:3003/api/health
      - You should see: "Fingerprint Bridge Server is running"

✅ VERIFICATION:

   After installation, go back to the web app and:
   1. Refresh the Dashboard page
   2. Look for "Fingerprint Connected: ✅" status
   3. Click "Fingerprint Attendance" button to test

🔧 MANAGING THE SERVICE:

   Start Service:
      net start FingerprintBridgeService

   Stop Service:
      net stop FingerprintBridgeService

   Restart Service:
      net stop FingerprintBridgeService && net start FingerprintBridgeService

   Uninstall Service:
      Run UNINSTALL_SERVICE.bat (as Administrator)

📞 TROUBLESHOOTING:

   ❌ "Device not connected" error:
      → Check USB cable connection
      → Install ZKTeco drivers
      → Run: python -c "from pyzkfp import ZKFP2; print('OK')"

   ❌ "Port 3003 already in use":
      → Stop the service: net stop FingerprintBridgeService
      → Check other apps using port 3003

   ❌ Service won't start:
      → Check Node.js is installed: node --version
      → Check Python is installed: python --version
      → Check pyzkfp: python -c "import pyzkfp"

   ❌ Web app can't connect:
      → Check firewall allows port 3003
      → Check service is running: net start FingerprintBridgeService
      → Visit http://localhost:3003/api/health in browser

🌐 NETWORK CONFIGURATION:

   The bridge server runs on:
      http://localhost:3003

   Make sure your firewall allows:
      - Inbound connections on port 3003
      - Outbound connections to MongoDB (if using cloud DB)

📝 LOGS:

   Service logs can be found at:
      C:\\Windows\\System32\\config\\systemprofile\\AppData\\Local\\Temp\\

   To view live logs:
      1. Stop the service
      2. Run START_BRIDGE.bat (console mode)
      3. Watch the output

🎉 SUCCESS!

   Once installed and running:
   - Service starts automatically with Windows
   - Fingerprint scanner works seamlessly with web app
   - No need to manually start anything

════════════════════════════════════════════════════════════════════════════

For more help, visit: https://github.com/your-repo/wiki
Support: admin@example.com

Generated: ${new Date().toLocaleString()}
Version: 2.0.0
`;

    archive.append(installInstructions, { name: 'fingerprint-bridge/INSTALLATION_GUIDE.txt' });

    // Finalize archive
    archive.finalize();

    console.log('📦 Fingerprint bridge installer download started');

  } catch (error) {
    console.error('Error creating download:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create download package',
      error: error.message
    });
  }
});

/**
 * GET /api/fingerprint-bridge/check-local
 * Proxy endpoint to check local bridge health
 * (Used by frontend to check if bridge is running)
 */
router.get('/check-local', async (req, res) => {
  try {
    // We can't directly call localhost:3003 from the backend
    // This endpoint just returns instructions for the frontend
    res.json({
      success: true,
      message: 'Please check local bridge from your browser',
      checkURL: 'http://localhost:3003/api/health',
      instructions: 'Open the checkURL in your browser to verify the bridge is running'
    });
  } catch (error) {
    console.error('Error checking local bridge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check local bridge',
      error: error.message
    });
  }
});

export default router;
