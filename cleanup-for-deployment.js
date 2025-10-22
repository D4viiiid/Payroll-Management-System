// ============================================================================
// 🧹 PRE-DEPLOYMENT CLEANUP SCRIPT
// Removes all unnecessary files before Vercel deployment
// ============================================================================

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

console.log('🧹 Starting Pre-Deployment Cleanup...\n');

// Files/folders to DELETE
const filesToDelete = [
  // All markdown documentation files (except README.md)
  '*.md',
  '!README.md',
  '!INSTALLATION.md',
  '!CONTRIBUTING.md',
  
  // Test files
  'test-*.js',
  'verify-*.js',
  'inspect-*.js',
  'debug.log',
  '**/testing/',
  '**/*.test.js',
  '**/*.spec.js',
  
  // Backup files
  '*-backup.js',
  '*-old.js',
  '*-v2.js',
  '*-final.js',
  '**/*_backup*',
  
  // Local database files
  '*.db',
  '*.sqlite',
  'fingerprint_database.db',
  
  // Development folders
  'coverage/',
  '.vscode/',
  '.qodo/',
  '.repo-sync/',
  '.venv/',
  
  // Build artifacts (will be regenerated)
  'employee/dist/',
  'employee/node_modules/',
  'employee/payroll-backend/node_modules/',
  
  // Environment files (will be set in Vercel)
  'employee/.env',
  'employee/payroll-backend/.env',
  
  // Log files
  '*.log',
  '**/logs/',
  
  // Temporary files
  'query',
  '*.tmp',
  '*.temp',
  
  // CSS/HTML test files
  'responsive-dashboard.css',
  'responsive-dashboard.html',
  
  // Old server folder (if exists)
  'server/server/',
];

// Documentation files to keep (move to /docs)
const docsToKeep = [
  'README.md',
  'INSTALLATION.md',
  'CONTRIBUTING.md',
  'COPILOT_INSTRUCTIONS.md'
];

// Function to delete files matching pattern
function deleteFiles(pattern) {
  const glob = require('glob');
  const files = glob.sync(pattern, { ignore: docsToKeep, dot: true });
  
  let deletedCount = 0;
  files.forEach(file => {
    try {
      const filePath = path.join(rootDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`📁 Deleted folder: ${file}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted file: ${file}`);
      }
      deletedCount++;
    } catch (err) {
      console.error(`❌ Error deleting ${file}:`, err.message);
    }
  });
  
  return deletedCount;
}

// 1. Delete all markdown documentation files (except essential ones)
console.log('\n📄 Removing documentation files...');
const mdFiles = fs.readdirSync(rootDir).filter(file => 
  file.endsWith('.md') && !docsToKeep.includes(file)
);
mdFiles.forEach(file => {
  try {
    fs.unlinkSync(path.join(rootDir, file));
    console.log(`🗑️  Deleted: ${file}`);
  } catch (err) {
    console.error(`❌ Error deleting ${file}:`, err.message);
  }
});

// 2. Delete test files
console.log('\n🧪 Removing test files...');
const testFiles = fs.readdirSync(rootDir).filter(file => 
  file.startsWith('test-') || file.startsWith('verify-') || file.startsWith('inspect-')
);
testFiles.forEach(file => {
  try {
    fs.unlinkSync(path.join(rootDir, file));
    console.log(`🗑️  Deleted: ${file}`);
  } catch (err) {
    console.error(`❌ Error deleting ${file}:`, err.message);
  }
});

// 3. Delete specific folders
console.log('\n📁 Removing development folders...');
const foldersToDelete = [
  '.vscode',
  '.qodo',
  '.repo-sync',
  '.venv',
  'employee/testing',
  'coverage'
];

foldersToDelete.forEach(folder => {
  const folderPath = path.join(rootDir, folder);
  if (fs.existsSync(folderPath)) {
    try {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`📁 Deleted folder: ${folder}`);
    } catch (err) {
      console.error(`❌ Error deleting ${folder}:`, err.message);
    }
  }
});

// 4. Delete local database files
console.log('\n💾 Removing local database files...');
const dbFiles = ['fingerprint_database.db', 'query'];
dbFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted: ${file}`);
    } catch (err) {
      console.error(`❌ Error deleting ${file}:`, err.message);
    }
  }
});

// 5. Delete log files
console.log('\n📋 Removing log files...');
if (fs.existsSync(path.join(rootDir, 'debug.log'))) {
  fs.unlinkSync(path.join(rootDir, 'debug.log'));
  console.log(`🗑️  Deleted: debug.log`);
}

// 6. Create .env.example files
console.log('\n📝 Creating .env.example files...');

// Frontend .env.example
const frontendEnvExample = `# Frontend Environment Variables
VITE_API_URL=https://your-backend-api.vercel.app/api
VITE_APP_NAME=Payroll Management System
VITE_ENV=production
`;

fs.writeFileSync(
  path.join(rootDir, 'employee', '.env.example'),
  frontendEnvExample
);
console.log('✅ Created: employee/.env.example');

// Backend .env.example
const backendEnvExample = `# Backend Environment Variables
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/employee_db
JWT_SECRET=your_jwt_secret_key_here_32_characters_minimum
JWT_EXPIRES_IN=90d
CORS_ORIGIN=https://your-frontend.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
`;

fs.writeFileSync(
  path.join(rootDir, 'employee', 'payroll-backend', '.env.example'),
  backendEnvExample
);
console.log('✅ Created: employee/payroll-backend/.env.example');

// 7. Update .gitignore
console.log('\n📝 Updating .gitignore...');
const gitignoreContent = `# Dependencies
node_modules/
package-lock.json
.pnp
.pnp.js

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production
config.env

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
debug.log

# Build outputs
dist/
build/
.next/
out/

# Testing
coverage/
.nyc_output
*.test.js
*.spec.js

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Database
*.db
*.sqlite
*.sqlite3

# Python
.venv/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/

# Temporary files
*.tmp
*.temp
query

# Backup files
*-backup.*
*-old.*
*-v2.*
backup/
backups/

# Documentation (except essential)
*.md
!README.md
!INSTALLATION.md
!CONTRIBUTING.md
!VERCEL_DEPLOYMENT_COMPLETE_GUIDE.md
!BIOMETRIC_BRIDGE_SETUP.md

# Development
.qodo/
.repo-sync/
testing/

# Vercel
.vercel
`;

fs.writeFileSync(path.join(rootDir, '.gitignore'), gitignoreContent);
console.log('✅ Updated: .gitignore');

console.log('\n✅ Cleanup completed successfully!');
console.log('\n📊 Summary:');
console.log(`   - Deleted ${mdFiles.length} markdown files`);
console.log(`   - Deleted ${testFiles.length} test files`);
console.log(`   - Deleted ${foldersToDelete.length} folders`);
console.log('   - Created .env.example files');
console.log('   - Updated .gitignore');

console.log('\n⚠️  IMPORTANT: Review the changes before committing!');
console.log('   Run: git status');
console.log('   Then: git add . && git commit -m "chore: prepare for Vercel deployment"');
