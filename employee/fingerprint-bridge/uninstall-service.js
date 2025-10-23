/**
 * Windows Service Uninstaller for Fingerprint Bridge
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'FingerprintBridgeService',
  script: path.join(__dirname, 'bridge.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function() {
  console.log('✅ Service uninstalled successfully!');
  console.log('The Fingerprint Bridge Service has been removed.');
});

svc.on('alreadyuninstalled', function() {
  console.log('⚠️  Service is not installed.');
});

svc.on('error', function(err) {
  console.error('❌ Uninstall error:', err);
});

// Uninstall the service
console.log('🗑️  Uninstalling Fingerprint Bridge Service...');
svc.uninstall();
