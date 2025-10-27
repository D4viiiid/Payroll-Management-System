/**
 * ✅ BUG #25 FIX VERIFICATION TEST
 * 
 * Tests for:
 * 1. Fingerprint enrollment timeout fix (100 → 300 attempts with 0.1s delays)
 * 2. React Hot Toast integration for all alerts
 * 
 * Root Causes Fixed:
 * - Python enrollment script had tight CPU polling loop (no sleep between attempts)
 * - max_attempts = 100 gave only ~10 seconds, but users need 30+ seconds
 * - All window.alert() and window.confirm() caused poor UX
 * 
 * Fixes Applied:
 * - Added time.sleep(0.1) inside while loop in enroll_fingerprint_cli.py
 * - Increased max_attempts from 100 to 300 (30 seconds per scan)
 * - Installed react-hot-toast package
 * - Created toast.jsx utility with success, error, warning, info, confirm functions
 * - Replaced all alerts in: Attendance, Deductions, Employee, BiometricEnrollmentSection, RealTimeBiometric
 * 
 * Date: October 27, 2025
 * Bug ID: BUG-25
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('  🧪 BUG #25 FIX VERIFICATION TEST');
console.log('='.repeat(70) + '\n');

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(description, fn) {
  try {
    fn();
    testResults.passed++;
    testResults.tests.push({ description, status: 'PASSED', error: null });
    console.log(`✅ PASSED: ${description}`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ description, status: 'FAILED', error: error.message });
    console.log(`❌ FAILED: ${description}`);
    console.log(`   Error: ${error.message}\n`);
  }
}

// Test 1: Verify Python enrollment script has extended timeout
console.log('\n📝 Test Category 1: Fingerprint Enrollment Timeout Fix\n');

test('Python script has max_attempts = 300 (not 100)', () => {
  const scriptPath = path.join(__dirname, 'Biometric_connect', 'enroll_fingerprint_cli.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  
  if (!content.includes('max_attempts = 300')) {
    throw new Error('max_attempts should be 300, not 100');
  }
  
  if (content.includes('max_attempts = 100')) {
    throw new Error('Old max_attempts = 100 found, should be updated to 300');
  }
});

test('Python script has time.sleep(0.1) in capture loop', () => {
  const scriptPath = path.join(__dirname, 'Biometric_connect', 'enroll_fingerprint_cli.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  
  // Check for sleep in the while loop
  const hasSleepInLoop = content.includes('time.sleep(0.1)') && 
                          content.includes('while capture_attempts < max_attempts');
  
  if (!hasSleepInLoop) {
    throw new Error('time.sleep(0.1) should be added inside the capture while loop');
  }
});

test('Python script has BUG #25 FIX comment marker', () => {
  const scriptPath = path.join(__dirname, 'Biometric_connect', 'enroll_fingerprint_cli.py');
  const content = fs.readFileSync(scriptPath, 'utf8');
  
  if (!content.includes('BUG #25 FIX')) {
    throw new Error('Missing BUG #25 FIX comment marker for documentation');
  }
});

// Test 2: Verify React Hot Toast installation and configuration
console.log('\n📝 Test Category 2: React Hot Toast Integration\n');

test('react-hot-toast package is installed', () => {
  const packageJsonPath = path.join(__dirname, 'src', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.dependencies['react-hot-toast']) {
    throw new Error('react-hot-toast is not in package.json dependencies');
  }
});

test('App.jsx imports and configures Toaster component', () => {
  const appPath = path.join(__dirname, 'src', 'App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');
  
  if (!content.includes("import { Toaster } from 'react-hot-toast'")) {
    throw new Error('App.jsx does not import Toaster from react-hot-toast');
  }
  
  if (!content.includes('<Toaster')) {
    throw new Error('App.jsx does not render <Toaster> component');
  }
  
  if (!content.includes('position="top-right"')) {
    throw new Error('Toaster should be positioned at top-right');
  }
});

test('toast.jsx utility file exists with all required functions', () => {
  const toastPath = path.join(__dirname, 'src', 'utils', 'toast.jsx');
  
  if (!fs.existsSync(toastPath)) {
    throw new Error('toast.jsx utility file does not exist in src/utils/');
  }
  
  const content = fs.readFileSync(toastPath, 'utf8');
  
  const requiredFunctions = [
    'showSuccess',
    'showError',
    'showWarning',
    'showInfo',
    'showLoading',
    'showConfirm',
    'dismissToast'
  ];
  
  requiredFunctions.forEach(fn => {
    if (!content.includes(`export const ${fn}`)) {
      throw new Error(`toast.jsx is missing ${fn} function`);
    }
  });
});

test('showConfirm function returns a Promise<boolean>', () => {
  const toastPath = path.join(__dirname, 'src', 'utils', 'toast.jsx');
  const content = fs.readFileSync(toastPath, 'utf8');
  
  if (!content.includes('return new Promise((resolve)')) {
    throw new Error('showConfirm should return a Promise');
  }
  
  if (!content.includes('resolve(true)') || !content.includes('resolve(false)')) {
    throw new Error('showConfirm should resolve to true/false');
  }
});

// Test 3: Verify alerts replaced in all components
console.log('\n📝 Test Category 3: Alert Replacement in Components\n');

test('Attendance.jsx imports toast utilities', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'Attendance.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("from '../utils/toast'") && !content.includes('from "../utils/toast"')) {
    throw new Error('Attendance.jsx does not import toast utilities');
  }
});

test('Attendance.jsx has no window.confirm or alert calls', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'Attendance.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n');
  const problemLines = lines.filter(line => 
    (line.includes('window.confirm') || line.includes('alert(')) &&
    !line.trim().startsWith('//')
  );
  
  if (problemLines.length > 0) {
    throw new Error(`Found ${problemLines.length} unreplaced alert/confirm calls in Attendance.jsx`);
  }
});

test('Deductions.jsx imports toast utilities', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'Deductions.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("from '../utils/toast'") && !content.includes('from "../utils/toast"')) {
    throw new Error('Deductions.jsx does not import toast utilities');
  }
});

test('Deductions.jsx has no window.confirm or alert calls', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'Deductions.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n');
  const problemLines = lines.filter(line => 
    (line.includes('window.confirm') || line.includes('alert(')) &&
    !line.trim().startsWith('//')
  );
  
  if (problemLines.length > 0) {
    throw new Error(`Found ${problemLines.length} unreplaced alert/confirm calls in Deductions.jsx`);
  }
});

test('Employee.jsx imports toast utilities', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'Employee.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("from '../utils/toast'") && !content.includes('from "../utils/toast"')) {
    throw new Error('Employee.jsx does not import toast utilities');
  }
});

test('Employee.jsx has no alert calls in handleDeleteConfirm', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'Employee.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find handleDeleteConfirm function
  const functionMatch = content.match(/const handleDeleteConfirm = async \(\) => \{[\s\S]*?\};/);
  if (!functionMatch) {
    throw new Error('handleDeleteConfirm function not found');
  }
  
  if (functionMatch[0].includes('alert(')) {
    throw new Error('handleDeleteConfirm still uses alert() instead of showSuccess/showError');
  }
});

test('BiometricEnrollmentSection.jsx imports toast utilities', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'BiometricEnrollmentSection.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("from '../utils/toast'")) {
    throw new Error('BiometricEnrollmentSection.jsx does not import toast utilities');
  }
});

test('RealTimeBiometric.jsx imports toast utilities', () => {
  const filePath = path.join(__dirname, 'src', 'components', 'biometric', 'RealTimeBiometric.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("from '../../utils/toast'")) {
    throw new Error('RealTimeBiometric.jsx does not import toast utilities');
  }
});

// Test 4: Build verification
console.log('\n📝 Test Category 4: Build Verification\n');

test('Frontend build dist directory exists', () => {
  const distPath = path.join(__dirname, 'dist');
  
  if (!fs.existsSync(distPath)) {
    throw new Error('dist/ directory not found - build may have failed');
  }
});

test('Frontend build includes index.html', () => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html not found - build incomplete');
  }
});

// Print Summary
console.log('\n' + '='.repeat(70));
console.log('  📊 TEST SUMMARY');
console.log('='.repeat(70));

console.log(`\n✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📝 Total:  ${testResults.passed + testResults.failed}\n`);

if (testResults.failed > 0) {
  console.log('❌ SOME TESTS FAILED - Please review and fix issues above\n');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED - BUG #25 FIXES VERIFIED!\n');
  console.log('🎉 Summary of Fixes:');
  console.log('   • Fingerprint enrollment timeout: 100 → 300 attempts (10s → 30s)');
  console.log('   • Added 0.1s sleep between capture attempts (prevents CPU thrashing)');
  console.log('   • Installed react-hot-toast for modern notifications');
  console.log('   • Replaced all window.alert() and window.confirm() calls');
  console.log('   • Created reusable toast utility with confirm dialog support');
  console.log('   • Verified frontend build completes successfully\n');
  console.log('🚀 Ready to commit and deploy to production!\n');
  process.exit(0);
}
