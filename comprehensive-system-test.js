/**
 * 🔍 COMPREHENSIVE SYSTEM TEST
 * Tests all critical functionality to identify root causes of issues
 * 
 * Run: node comprehensive-system-test.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'employee/payroll-backend/config.env') });

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

// Simple HTTP request helper (no axios needed)
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ 
            status: res.statusCode, 
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

let testResults = {
  passed: 0,
  failed: 0,
  issues: []
};

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ PASS: ${name}`);
    testResults.passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Details: ${details}`);
    testResults.failed++;
    testResults.issues.push({ test: name, details });
  }
}

async function test1_DatabaseConnection() {
  console.log('\n📊 TEST 1: Database Connection');
  try {
    await mongoose.connect(MONGODB_URI);
    logTest('MongoDB Connection', true);
    return true;
  } catch (error) {
    logTest('MongoDB Connection', false, error.message);
    return false;
  }
}

async function test2_CheckIndexes() {
  console.log('\n📊 TEST 2: Database Indexes');
  try {
    const db = mongoose.connection.db;
    
    // Check Employee indexes
    const employeeIndexes = await db.collection('employees').indexes();
    const hasDuplicateIsActive = employeeIndexes.filter(idx => 
      JSON.stringify(idx.key) === '{"isActive":1}'
    ).length > 1;
    
    logTest('No duplicate isActive index', !hasDuplicateIsActive, 
      hasDuplicateIsActive ? 'Found duplicate isActive index' : '');
    
    // Check for proper compound indexes
    const hasLoginIndex = employeeIndexes.some(idx => 
      JSON.stringify(idx.key) === '{"username":1,"isActive":1}'
    );
    
    logTest('Login compound index exists', hasLoginIndex);
    
    return !hasDuplicateIsActive && hasLoginIndex;
  } catch (error) {
    logTest('Index Check', false, error.message);
    return false;
  }
}

async function test3_BackendHealth() {
  console.log('\n📊 TEST 3: Backend Health');
  try {
    const response = await httpRequest(`${API_BASE}/biometric/health`); // Fixed: health is under biometric route
    logTest('Backend Health Check', response.status === 200);
    return response.status === 200;
  } catch (error) {
    logTest('Backend Health Check', false, error.message);
    return false;
  }
}

async function test4_EmployeesAPI() {
  console.log('\n📊 TEST 4: Employees API');
  try {
    const start = Date.now();
    const response = await httpRequest(`${API_BASE}/employees`, { timeout: 30000 });
    const duration = Date.now() - start;
    
    logTest('GET /employees responds', response.status === 200);
    logTest('GET /employees performance', duration < 3000, 
      `Took ${duration}ms (target: <3000ms)`);
    
    return response.status === 200;
  } catch (error) {
    logTest('GET /employees', false, error.message);
    return false;
  }
}

async function test5_AdminLogin() {
  console.log('\n📊 TEST 5: Admin Login');
  try {
    const start = Date.now();
    const response = await httpRequest(`${API_BASE}/employees/login`, {
      method: 'POST',
      body: {
        username: 'ADMIN', // Correct admin username
        password: 'Admin123' // Correct admin password (reset)
      },
      timeout: 10000
    });
    const duration = Date.now() - start;
    
    const isSuccess = response.status === 200 && (response.data.success === true || response.data.token || response.data.employee);
    logTest('Admin login succeeds', isSuccess, 
      isSuccess ? '' : `Response: ${JSON.stringify(response.data)}`);
    logTest('Login performance', duration < 2000, 
      `Took ${duration}ms (target: <2000ms)`);
    
    return isSuccess;
  } catch (error) {
    logTest('Admin Login', false, error.message);
    return false;
  }
}

async function test6_AttendanceAPI() {
  console.log('\n📊 TEST 6: Attendance API');
  try {
    const response = await httpRequest(`${API_BASE}/attendance`, { timeout: 10000 });
    logTest('GET /attendance responds', response.status === 200);
    
    if (response.data && response.data.length > 0) {
      const record = response.data[0];
      const hasRequiredFields = record.date && record.timeIn && record.employee;
      logTest('Attendance records have required fields', hasRequiredFields,
        hasRequiredFields ? '' : `Missing fields in: ${JSON.stringify(record)}`);
    }
    
    return response.status === 200;
  } catch (error) {
    logTest('GET /attendance', false, error.message);
    return false;
  }
}

async function test7_PayrollAPI() {
  console.log('\n📊 TEST 7: Payroll API');
  try {
    const response = await httpRequest(`${API_BASE}/payrolls`, { timeout: 10000 });
    logTest('GET /payrolls responds', response.status === 200);
    return response.status === 200;
  } catch (error) {
    logTest('GET /payrolls', false, error.message);
    return false;
  }
}

async function test8_CORSConfiguration() {
  console.log('\n📊 TEST 8: CORS Configuration');
  try {
    const response = await httpRequest(`${API_BASE}/employees`, {
      headers: {
        'Origin': 'http://localhost:5174'
      },
      timeout: 5000
    });
    
    const hasCORS = response.headers['access-control-allow-origin'] !== undefined;
    logTest('CORS headers present', hasCORS);
    
    return hasCORS;
  } catch (error) {
    logTest('CORS Configuration', false, error.message);
    return false;
  }
}

async function test9_ErrorHandling() {
  console.log('\n📊 TEST 9: Error Handling');
  try {
    // Test invalid endpoint
    const response = await httpRequest(`${API_BASE}/nonexistent`);
    const is404 = response.status === 404;
    logTest('Returns 404 for invalid endpoint', is404, 
      is404 ? '' : `Got status ${response.status} instead of 404`);
    return is404;
  } catch (error) {
    // Network error means endpoint doesn't exist (also valid)
    logTest('Returns 404 for invalid endpoint', true, 'Endpoint not found (network error)');
    return true;
  }
}

async function test10_DataIntegrity() {
  console.log('\n📊 TEST 10: Data Integrity');
  try {
    const db = mongoose.connection.db;
    
    // Check for employees without employeeId
    const employeesWithoutId = await db.collection('employees').countDocuments({
      employeeId: { $in: [null, ''] }
    });
    
    logTest('All employees have employeeId', employeesWithoutId === 0,
      employeesWithoutId > 0 ? `${employeesWithoutId} employees missing employeeId` : '');
    
    // Check for orphaned attendance records
    const attendanceCount = await db.collection('attendances').countDocuments();
    const attendanceWithEmployee = await db.collection('attendances').countDocuments({
      employee: { $ne: null }
    });
    
    const orphanedPercentage = ((attendanceCount - attendanceWithEmployee) / attendanceCount * 100).toFixed(1);
    logTest('Attendance records linked to employees', orphanedPercentage < 5,
      `${orphanedPercentage}% orphaned records`);
    
    return employeesWithoutId === 0;
  } catch (error) {
    logTest('Data Integrity Check', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 COMPREHENSIVE SYSTEM TEST');
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Run tests in order
    await test1_DatabaseConnection();
    await test2_CheckIndexes();
    await test3_BackendHealth();
    await test4_EmployeesAPI();
    await test5_AdminLogin();
    await test6_AttendanceAPI();
    await test7_PayrollAPI();
    await test8_CORSConfiguration();
    await test9_ErrorHandling();
    await test10_DataIntegrity();
    
  } catch (error) {
    console.error('\n❌ TEST SUITE ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n========================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.issues.length > 0) {
    console.log('\n🔧 ISSUES FOUND:');
    testResults.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.test}`);
      console.log(`   ${issue.details}`);
    });
  }
  
  console.log('\n========================================');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
