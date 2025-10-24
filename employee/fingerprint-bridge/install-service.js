/**
 * Windows Service Installer for Fingerprint Bridge
 * This creates a Windows service that runs automatically on boot
 * 
 * IMPORTANT: This script MUST be run from the fingerprint-bridge directory
 * Example: cd C:\fingerprint-bridge && node install-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// ✅ FIX: Use process.cwd() to get the current working directory
// This ensures we get the directory where the user ran the script from
const INSTALL_DIR = process.cwd();
const BRIDGE_SCRIPT = path.join(INSTALL_DIR, 'bridge.js');

// Verify bridge.js exists before installing service
if (!fs.existsSync(BRIDGE_SCRIPT)) {
  console.error('❌ ERROR: bridge.js not found in current directory!');
  console.error('   Expected: ' + BRIDGE_SCRIPT);
  console.error('   Current directory: ' + INSTALL_DIR);
  console.error('\n💡 Please run this script from the fingerprint-bridge directory:');
  console.error('   cd C:\\path\\to\\fingerprint-bridge');
  console.error('   node install-service.js');
  process.exit(1);
}

console.log('📂 Installation directory: ' + INSTALL_DIR);
console.log('📄 Bridge script: ' + BRIDGE_SCRIPT);

// Create a new service object
const svc = new Service({
  name: 'FingerprintBridgeService',
  description: 'Fingerprint Bridge Server for ZKTeco device integration',
  script: BRIDGE_SCRIPT, // ✅ Use absolute path
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "BRIDGE_PORT",
      value: "3003"
    },
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "BRIDGE_DIR",
      value: INSTALL_DIR
    }
  ],
  // ✅ Set working directory to installation directory
  workingDirectory: INSTALL_DIR
});

// Listen for the "install" event
svc.on('install', function() {
  console.log('✅ Service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', function() {
  console.log('✅ Service started successfully!');
  console.log(`🔐 Fingerprint Bridge running on http://localhost:3003`);
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  Service already installed.');
  console.log('To reinstall, run UNINSTALL_SERVICE.bat first.');
});

svc.on('invalidinstallation', function() {
  console.log('❌ Invalid installation detected.');
});

svc.on('error', function(err) {
  console.error('❌ Service error:', err);
});

// Install the service
console.log('📦 Installing Fingerprint Bridge Service...');
svc.install();
