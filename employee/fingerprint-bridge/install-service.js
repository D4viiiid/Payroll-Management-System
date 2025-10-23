/**
 * Windows Service Installer for Fingerprint Bridge
 * This creates a Windows service that runs automatically on boot
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'FingerprintBridgeService',
  description: 'Fingerprint Bridge Server for ZKTeco device integration',
  script: path.join(__dirname, 'bridge.js'),
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
    }
  ]
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
