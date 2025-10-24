/**
 * SSL Certificate Generator for Fingerprint Bridge
 * 
 * Generates self-signed SSL certificate for localhost HTTPS server
 * This allows the Vercel HTTPS web app to connect to local bridge
 * 
 * Why needed:
 * - Browsers block HTTPS → HTTP (Mixed Content)
 * - Browsers allow HTTPS → HTTPS (even with self-signed cert)
 * 
 * Usage:
 * - Automatic: Called by INSTALL_AUTO_SERVICE.bat
 * - Manual: node generate-certificate.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CERT_FILE = path.join(__dirname, 'cert.pem');
const KEY_FILE = path.join(__dirname, 'key.pem');

console.log('\n🔐 SSL Certificate Generator for Fingerprint Bridge\n');
console.log('═'.repeat(60));

// Check if certificates already exist
if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
  console.log('\n✅ SSL certificates already exist!');
  console.log(`   📄 Certificate: ${CERT_FILE}`);
  console.log(`   🔑 Private Key: ${KEY_FILE}`);
  console.log('\n💡 To regenerate, delete these files and run again.\n');
  process.exit(0);
}

console.log('\n📋 Checking for OpenSSL...\n');

// Try to find OpenSSL
let opensslCmd = 'openssl';
let opensslFound = false;

// Check if OpenSSL is in PATH
try {
  execSync('openssl version', { stdio: 'pipe' });
  opensslFound = true;
  console.log('✅ OpenSSL found in PATH');
} catch (error) {
  // Try common installation paths
  const possiblePaths = [
    'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\OpenSSL-Win32\\bin\\openssl.exe',
    'C:\\OpenSSL-Win64\\bin\\openssl.exe',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe', // Git Bash includes OpenSSL
  ];

  for (const opensslPath of possiblePaths) {
    if (fs.existsSync(opensslPath)) {
      opensslCmd = `"${opensslPath}"`;
      opensslFound = true;
      console.log(`✅ OpenSSL found: ${opensslPath}`);
      break;
    }
  }
}

if (!opensslFound) {
  console.log('\n❌ OpenSSL not found!\n');
  console.log('📥 Please install OpenSSL:\n');
  console.log('   Option 1: Install Git for Windows (includes OpenSSL)');
  console.log('   Download: https://git-scm.com/download/win\n');
  console.log('   Option 2: Install OpenSSL directly');
  console.log('   Download: https://slproweb.com/products/Win32OpenSSL.html\n');
  console.log('💡 After installation, run this script again.\n');
  process.exit(1);
}

console.log('\n🔨 Generating self-signed SSL certificate...\n');

try {
  // Generate private key and certificate in one command
  const opensslCommand = `${opensslCmd} req -x509 -newkey rsa:4096 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes -subj "/CN=localhost/O=Fingerprint Bridge/C=US"`;
  
  console.log('   Running OpenSSL command...');
  execSync(opensslCommand, { stdio: 'pipe' });
  
  // Verify files were created
  if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
    throw new Error('Certificate files were not created');
  }

  console.log('\n✅ SSL Certificate generated successfully!\n');
  console.log('   📄 Certificate: cert.pem');
  console.log('   🔑 Private Key: key.pem');
  console.log('   ⏰ Valid for: 365 days\n');
  
  console.log('═'.repeat(60));
  console.log('\n⚠️  IMPORTANT: Browser Certificate Warning\n');
  console.log('   When you first access https://localhost:3003:');
  console.log('   1. Browser will show "Your connection is not private"');
  console.log('   2. Click "Advanced" button');
  console.log('   3. Click "Proceed to localhost (unsafe)"');
  console.log('   4. This is SAFE - it\'s your own computer!\n');
  
  console.log('   After accepting once, browser remembers.\n');
  console.log('═'.repeat(60));
  console.log('\n✅ Bridge will now run on HTTPS (https://localhost:3003)\n');
  console.log('   This allows the Vercel web app to connect! 🎉\n');

  process.exit(0);

} catch (error) {
  console.log('\n❌ Error generating certificate:\n');
  console.log(`   ${error.message}\n`);
  
  if (error.stderr) {
    console.log('   Details:');
    console.log(`   ${error.stderr.toString()}\n`);
  }
  
  console.log('💡 Try running as Administrator\n');
  process.exit(1);
}
