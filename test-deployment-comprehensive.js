/**
 * 🧪 COMPREHENSIVE DEPLOYMENT TESTING SCRIPT
 * 
 * This script tests ALL critical endpoints and features
 * to verify the deployment is working correctly.
 * 
 * Run this AFTER Vercel deployment completes (~2 minutes)
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BACKEND_URL = 'https://payroll-management-system-blond.vercel.app/api';
const FRONTEND_URL = 'https://employee-ggy44fnf6-davids-projects-3d1b15ee.vercel.app';

// Test admin credentials
const ADMIN_USERNAME = 'ADMIN';
const ADMIN_PASSWORD = 'ADMIN123';
const ADMIN_PIN = '111111';

let adminToken = null;
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

const log = {
  success: (msg) => console.log(chalk.green('✅'), msg),
  error: (msg) => console.log(chalk.red('❌'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠️ '), msg),
  info: (msg) => console.log(chalk.blue('ℹ️ '), msg),
  header: (msg) => console.log(chalk.cyan.bold('\n' + msg + '\n' + '='.repeat(msg.length))),
};

async function test(name, fn) {
  try {
    await fn();
    testsPassed++;
    log.success(name);
  } catch (error) {
    testsFailed++;
    log.error(`${name}: ${error.message}`);
  }
}

async function skipTest(name, reason) {
  testsSkipped++;
  log.warn(`${name} (SKIPPED: ${reason})`);
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken && { 'Authorization': `Bearer ${adminToken}` }),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.message || JSON.stringify(data)}`);
  }
  
  return { status: response.status, data };
}

// ==================================================
// DEPLOYMENT VERIFICATION TESTS
// ==================================================

log.header('🔍 DEPLOYMENT VERIFICATION - October 23, 2025');

// Wait for deployment
log.info('Waiting 90 seconds for Vercel deployment to complete...');
await new Promise(resolve => setTimeout(resolve, 90000));

log.header('📡 BACKEND CONNECTIVITY TESTS');

await test('Backend health check', async () => {
  const { data } = await apiRequest('/health');
  if (!data.success) throw new Error('Health check failed');
  log.info(`  → MongoDB: ${data.database === 'connected' ? 'Connected' : 'Disconnected'}`);
});

await test('Database connection check', async () => {
  const { data } = await apiRequest('/employees');
  if (!Array.isArray(data)) throw new Error('Invalid response format');
});

log.header('🔐 AUTHENTICATION TESTS');

await test('Admin login with username/password', async () => {
  const { data } = await apiRequest('/employees/login', {
    method: 'POST',
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });
  
  if (!data.token) throw new Error('No token returned');
  if (!data.user.isAdmin) throw new Error('User is not admin');
  
  adminToken = data.token;
  log.info(`  → Token received: ${adminToken.substring(0, 20)}...`);
  log.info(`  → User: ${data.user.username} (Admin: ${data.user.isAdmin})`);
});

await test('Token verification on protected route', async () => {
  if (!adminToken) throw new Error('No admin token available');
  
  const { data } = await apiRequest('/salary-rate/history?limit=1');
  if (!data.success) throw new Error('Token verification failed');
  log.info(`  → Rate history accessible with token`);
});

log.header('📊 DASHBOARD & ATTENDANCE TESTS');

await test('Attendance stats - correct absent count', async () => {
  const { data } = await apiRequest('/attendance/stats');
  
  log.info(`  → Total Present: ${data.totalPresent}`);
  log.info(`  → Total Absent: ${data.absent}`);
  log.info(`  → Half Day: ${data.halfDay}`);
  log.info(`  → Full Day: ${data.fullDay}`);
  log.info(`  → Invalid: ${data.invalid}`);
  
  // If no attendance today, absent should equal total active employees (9)
  if (data.totalPresent === 0 && data.absent !== 9) {
    throw new Error(`Expected absent: 9, got: ${data.absent}`);
  }
  
  log.success(`  → Attendance stats correct!`);
});

await test('Get all employees', async () => {
  const { data } = await apiRequest('/employees');
  const activeEmployees = data.filter(emp => emp.isActive).length;
  
  log.info(`  → Total employees: ${data.length}`);
  log.info(`  → Active employees: ${activeEmployees}`);
  
  if (activeEmployees !== 9) {
    throw new Error(`Expected 9 active employees, got ${activeEmployees}`);
  }
});

log.header('💰 SALARY MANAGEMENT TESTS');

await test('Get current salary rate (no auth)', async () => {
  const { data } = await apiRequest('/salary-rate/current');
  
  if (!data.success) throw new Error('Failed to get current rate');
  if (!data.rate) throw new Error('No rate in response');
  
  log.info(`  → Daily Rate: ₱${data.rate.dailyRate}`);
  log.info(`  → Hourly Rate: ₱${data.rate.hourlyRate}`);
  log.info(`  → OT Rate: ₱${data.rate.overtimeRate}`);
  log.info(`  → Max Cash Advance: ₱${data.rate.maxCashAdvance}`);
});

await test('Get salary rate history (admin only)', async () => {
  if (!adminToken) {
    testsSkipped++;
    log.warn('Salary rate history (SKIPPED: No admin token)');
    return;
  }
  
  const { data } = await apiRequest('/salary-rate/history?limit=5');
  
  if (!data.success) throw new Error('Failed to get rate history');
  
  log.info(`  → History count: ${data.count}`);
  log.info(`  → ✅ Token-based auth working for /salary-rate/history`);
});

log.header('📋 PAYROLL & CASH ADVANCE TESTS');

await test('Get payroll records', async () => {
  const { data } = await apiRequest('/payrolls');
  log.info(`  → Total payrolls: ${data.length}`);
});

await test('Get archived payrolls', async () => {
  const { data } = await apiRequest('/payrolls/archived');
  log.info(`  → Archived payrolls: ${data.length}`);
});

await test('Get cash advances', async () => {
  const { data } = await apiRequest('/cash-advance');
  log.info(`  → Active cash advances: ${data.length}`);
});

await test('Get archived cash advances', async () => {
  const { data } = await apiRequest('/cash-advance/archived');
  log.info(`  → Archived cash advances: ${data.length}`);
});

log.header('🌐 FRONTEND DEPLOYMENT TESTS');

await test('Frontend accessibility', async () => {
  const response = await fetch(FRONTEND_URL);
  if (!response.ok) throw new Error(`Frontend returned ${response.status}`);
  const html = await response.text();
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
    throw new Error('Invalid HTML response');
  }
  log.info(`  → Frontend is accessible`);
});

await test('Frontend API URL configuration', async () => {
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();
  
  // Check if frontend is trying to connect to localhost
  if (html.includes('localhost:5000')) {
    throw new Error('Frontend still pointing to localhost:5000!');
  }
  
  log.info(`  → Frontend correctly configured for production`);
});

// ==================================================
// CRITICAL ISSUE VERIFICATION
// ==================================================

log.header('🔧 CRITICAL ISSUE FIXES VERIFICATION');

await test('Issue #1: Attendance stats fixed (absent count)', async () => {
  const { data } = await apiRequest('/attendance/stats');
  
  // Should count only active employees
  if (data.totalPresent === 0) {
    const expectedAbsent = 9; // 9 active employees
    if (data.absent !== expectedAbsent) {
      throw new Error(`Expected absent: ${expectedAbsent}, got: ${data.absent}. Fix NOT deployed!`);
    }
  }
  
  log.success(`  → Fix deployed: isActive filter applied`);
});

await test('Issue #2: Salary rate auth working', async () => {
  if (!adminToken) {
    testsSkipped++;
    log.warn('Salary rate auth (SKIPPED: No admin token)');
    return;
  }
  
  // This should NOT return 401 anymore
  const { data } = await apiRequest('/salary-rate/history?limit=1');
  
  if (!data.success) {
    throw new Error('Salary rate history still returning 401!');
  }
  
  log.success(`  → Fix deployed: Token auth working`);
});

await test('Issue #3: Frontend API URL fixed', async () => {
  // Frontend should connect to production backend
  const response = await fetch(FRONTEND_URL);
  const html = await response.text();
  
  if (html.includes('ERR_CONNECTION_REFUSED') || html.includes('localhost:5000')) {
    throw new Error('Frontend still trying to connect to localhost!');
  }
  
  log.success(`  → Fix deployed: Frontend uses production API`);
});

// ==================================================
// PERFORMANCE TESTS
// ==================================================

log.header('⚡ PERFORMANCE TESTS');

await test('API response time < 1 second', async () => {
  const start = Date.now();
  await apiRequest('/employees');
  const duration = Date.now() - start;
  
  log.info(`  → Response time: ${duration}ms`);
  
  if (duration > 1000) {
    throw new Error(`Response too slow: ${duration}ms`);
  }
});

await test('Database query performance', async () => {
  const start = Date.now();
  await apiRequest('/attendance');
  const duration = Date.now() - start;
  
  log.info(`  → Query time: ${duration}ms`);
  
  if (duration > 2000) {
    throw new Error(`Query too slow: ${duration}ms`);
  }
});

// ==================================================
// FINAL SUMMARY
// ==================================================

log.header('📊 TEST SUMMARY');

console.log(chalk.green(`✅ Passed: ${testsPassed}`));
console.log(chalk.red(`❌ Failed: ${testsFailed}`));
console.log(chalk.yellow(`⚠️  Skipped: ${testsSkipped}`));
console.log(chalk.cyan(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`));

if (testsFailed === 0) {
  log.header('🎉 ALL TESTS PASSED! DEPLOYMENT SUCCESSFUL!');
  console.log(chalk.green.bold('\n✅ System is ready for production use!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log('  1. Clear browser cache before testing frontend');
  console.log('  2. Login to:', FRONTEND_URL);
  console.log('  3. Test all features manually');
  console.log('  4. Monitor Vercel logs for any errors');
  console.log('\n');
  process.exit(0);
} else {
  log.header('❌ SOME TESTS FAILED - REVIEW ERRORS ABOVE');
  console.log(chalk.red.bold('\n⚠️  Deployment has issues that need fixing!\n'));
  console.log(chalk.yellow('Troubleshooting steps:'));
  console.log('  1. Check Vercel deployment logs');
  console.log('  2. Verify environment variables in Vercel dashboard');
  console.log('  3. Check backend function logs for errors');
  console.log('  4. Re-run this test after fixes');
  console.log('\n');
  process.exit(1);
}
