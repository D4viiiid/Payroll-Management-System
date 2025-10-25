/**
 * Build Fingerprint Bridge Installer
 * 
 * This script creates a production-ready ZIP file containing
 * all necessary files for fingerprint bridge installation
 * 
 * Output: public/downloads/fingerprint-bridge-installer.zip
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_DIR = path.join(__dirname, 'fingerprint-bridge');
const OUTPUT_DIR = path.join(__dirname, 'public', 'downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'fingerprint-bridge-installer.zip');

console.log('📦 Building Fingerprint Bridge Installer...\n');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✅ Created output directory:', OUTPUT_DIR);
}

// Check if bridge directory exists
if (!fs.existsSync(BRIDGE_DIR)) {
  console.error('❌ ERROR: fingerprint-bridge directory not found at:', BRIDGE_DIR);
  process.exit(1);
}

// Create ZIP archive
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for archive events
output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(2);
  console.log(`\n✅ Installer created successfully!`);
  console.log(`   📁 Location: ${OUTPUT_FILE}`);
  console.log(`   📊 Size: ${sizeKB} KB`);
  console.log(`   📄 Total bytes: ${archive.pointer()}`);
  console.log('\n🎉 Build complete! You can now deploy the application.');
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  Warning:', err.message);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  console.error('❌ Archive error:', err);
  throw err;
});

// Pipe archive to file
archive.pipe(output);

// Add files to archive
const filesToInclude = [
  'bridge.js',
  'package.json',
  'install-service.js',
  'uninstall-service.js',
  'generate-certificate.js', // ✅ NEW: SSL certificate generator
  'INSTALL_AUTO_SERVICE.bat',
  'UNINSTALL_SERVICE.bat',
  'START_BRIDGE.bat',
  'README.md'
];

console.log('📂 Adding files to archive:\n');

filesToInclude.forEach(file => {
  const filePath = path.join(BRIDGE_DIR, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: `fingerprint-bridge/${file}` });
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ✗ ${file} (not found, skipping)`);
  }
});

// ✅ ADD PYTHON SCRIPTS - CRITICAL FOR DEVICE FUNCTIONALITY
const BIOMETRIC_DIR = path.join(__dirname, 'Biometric_connect');
const pythonScriptsToInclude = [
  'capture_fingerprint_ipc_complete.py',
  'enroll_fingerprint_cli.py', // ✅ NEW: CLI enrollment script
  'main.py',
  '__init__.py'
];

console.log('\n🐍 Adding Python scripts:\n');

// Create Biometric_connect folder in archive
pythonScriptsToInclude.forEach(file => {
  const filePath = path.join(BIOMETRIC_DIR, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: `fingerprint-bridge/Biometric_connect/${file}` });
    console.log(`   ✓ Biometric_connect/${file}`);
  } else {
    console.log(`   ✗ Biometric_connect/${file} (not found, skipping)`);
  }
});

// Add requirements.txt for Python dependencies
const requirementsTxt = `# Python Dependencies for Fingerprint Bridge
# Install with: pip install -r requirements.txt
# ✅ CRITICAL: Using exact versions that are known to work

pyzkfp==0.1.5
pymongo>=4.5.0
python-dotenv>=1.0.0
pillow>=10.0.0
requests>=2.28.0
dnspython>=2.3.0
`;
archive.append(requirementsTxt, { name: 'fingerprint-bridge/requirements.txt' });
console.log('   ✓ requirements.txt (Python dependencies)');

// ✅ NEW: Add config.env template
const configEnvTemplate = `# Configuration file for Fingerprint Bridge Server
# ✅ CRITICAL: This file contains MongoDB connection settings
# 
# IMPORTANT: Copy this file to 'config.env' (remove .example extension)
# and update with your actual MongoDB connection string
#
# For cloud MongoDB (MongoDB Atlas):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/employee_db?retryWrites=true&w=majority
#
# For local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/employee_db
#
# Replace with your actual MongoDB connection string:

MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0

# ✅ DO NOT commit actual credentials to version control!
# This template is for installation reference only.
`;
archive.append(configEnvTemplate, { name: 'fingerprint-bridge/config.env.example' });
console.log('   ✓ config.env.example (MongoDB configuration template)');

// Add installation guide
const installGuide = `
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
      Example: C:\\fingerprint-bridge

   2. Connect your ZKTeco fingerprint scanner via USB

   3. Open Command Prompt as Administrator

   4. Navigate to the extracted folder:
      cd C:\\fingerprint-bridge

   5. Install dependencies:
      npm install

   6. Run the installer batch file:
      Right-click "INSTALL_AUTO_SERVICE.bat"
      Select "Run as Administrator"

   7. Wait for installation to complete
      The service will start automatically

✅ VERIFICATION:

   After installation, verify the bridge is running:
   
   1. Open your browser
   2. Visit: http://localhost:3003/api/health
   3. You should see: "Fingerprint Bridge Server is running"
   
   Then go back to the web app:
   1. Refresh the Dashboard page
   2. Look for "Fingerprint Scanner Status" card
   3. You should see:
      - Bridge Software: ✅ Connected
      - USB Scanner: ✅ Connected (if scanner is plugged in)

🔧 MANAGING THE SERVICE:

   Start Service:
      net start FingerprintBridgeService

   Stop Service:
      net stop FingerprintBridgeService

   Restart Service:
      net stop FingerprintBridgeService
      net start FingerprintBridgeService

   Uninstall Service:
      Right-click "UNINSTALL_SERVICE.bat"
      Select "Run as Administrator"

📞 TROUBLESHOOTING:

   ❌ "Device not connected" error:
      1. Check USB cable connection
      2. Install ZKTeco drivers from manufacturer
      3. Test Python library:
         python -c "from pyzkfp import ZKFP2; print('OK')"

   ❌ "Port 3003 already in use":
      1. Stop the service:
         net stop FingerprintBridgeService
      2. Check other apps using port 3003:
         netstat -ano | findstr :3003
      3. Kill the process or change port in bridge.js

   ❌ Service won't start:
      1. Check Node.js is installed:
         node --version
      2. Check Python is installed:
         python --version
      3. Check pyzkfp library:
         python -c "import pyzkfp"
      4. View service logs in Event Viewer:
         Windows Logs > Application

   ❌ Web app can't connect:
      1. Check Windows Firewall allows port 3003
      2. Verify service is running:
         net start | findstr Fingerprint
      3. Test locally:
         http://localhost:3003/api/health

🌐 NETWORK CONFIGURATION:

   The bridge server runs on:
      http://localhost:3003

   Firewall rules required:
      - Inbound connections on TCP port 3003
      - Allow Node.js and Python in Windows Firewall

   If using remote access:
      - Update CORS settings in bridge.js
      - Add allowed origins

📝 LOGS:

   Service logs location:
      C:\\Windows\\System32\\config\\systemprofile\\AppData\\Local\\Temp\\

   Console logs (when running manually):
      Run START_BRIDGE.bat to see live logs

🎉 SUCCESS!

   Once installed and running:
   ✅ Service starts automatically with Windows
   ✅ Fingerprint scanner works seamlessly with web app
   ✅ Attendance tracking works offline (syncs to cloud)
   ✅ Fingerprint enrollment for new employees

════════════════════════════════════════════════════════════════════════════

Need help?
- Check README.md in the installation folder
- Contact system administrator
- GitHub: https://github.com/your-repo

Generated: ${new Date().toLocaleString()}
Version: 2.0.0
`;

archive.append(installGuide, { name: 'fingerprint-bridge/INSTALLATION_GUIDE.txt' });
console.log('   ✓ INSTALLATION_GUIDE.txt');

// Finalize archive
console.log('\n📦 Creating ZIP archive...');
archive.finalize();
