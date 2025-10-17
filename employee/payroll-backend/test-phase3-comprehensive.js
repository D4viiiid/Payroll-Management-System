/**
 * Phase 3 Comprehensive Test Suite
 * Tests for Reports and Archive functionality
 */

import moment from 'moment-timezone';

const API_BASE = 'http://localhost:5000/api';
const TIMEZONE = 'Asia/Manila';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passedTests = 0;
let failedTests = 0;
const testResults = [];

/**
 * Test helper function
 */
async function runTest(testName, testFn) {
  try {
    console.log(`\n${colors.cyan}Running: ${testName}${colors.reset}`);
    const result = await testFn();
    
    if (result.success) {
      passedTests++;
      console.log(`${colors.green}✓ PASSED${colors.reset}: ${testName}`);
      testResults.push({ test: testName, status: 'PASSED', details: result.message });
    } else {
      failedTests++;
      console.log(`${colors.red}✗ FAILED${colors.reset}: ${testName}`);
      console.log(`  Reason: ${result.message}`);
      testResults.push({ test: testName, status: 'FAILED', details: result.message });
    }
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}✗ ERROR${colors.reset}: ${testName}`);
    console.log(`  Error: ${error.message}`);
    testResults.push({ test: testName, status: 'ERROR', details: error.message });
  }
}

/**
 * Phase 3 Tests
 */

// Test 1: Weekly Payroll Report
async function testWeeklyPayrollReport() {
  const today = moment().tz(TIMEZONE);
  const startOfWeek = today.clone().startOf('week').format('YYYY-MM-DD');
  const endOfWeek = today.clone().endOf('week').format('YYYY-MM-DD');

  const response = await fetch(`${API_BASE}/reports/weekly-payroll?startDate=${startOfWeek}&endDate=${endOfWeek}`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Weekly report generated | Employees: ${data.report?.summary?.totalEmployees || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 2: Monthly Payroll Report
async function testMonthlyPayrollReport() {
  const today = moment().tz(TIMEZONE);
  const year = today.year();
  const month = today.month() + 1;

  const response = await fetch(`${API_BASE}/reports/monthly-payroll?year=${year}&month=${month}`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Monthly report generated | Total employees: ${data.report?.summary?.totalEmployees || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 3: Employee Report (YTD)
async function testEmployeeReport() {
  const year = moment().year();
  const testEmployeeId = '12345'; // Test with a sample employee ID

  const response = await fetch(`${API_BASE}/reports/employee/${testEmployeeId}?year=${year}`);
  const data = await response.json();

  // Employee might not exist, so both 200 (success) and 404 (not found) are acceptable
  if (response.status === 200 || response.status === 404) {
    return {
      success: true,
      message: `Employee report endpoint working | Status: ${response.status}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 4: Attendance Report
async function testAttendanceReport() {
  const today = moment().tz(TIMEZONE);
  const startDate = today.clone().subtract(7, 'days').format('YYYY-MM-DD');
  const endDate = today.format('YYYY-MM-DD');

  const response = await fetch(`${API_BASE}/reports/attendance?startDate=${startDate}&endDate=${endDate}`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Attendance report generated | Total records: ${data.report?.summary?.totalRecords || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 5: Cash Advance Report
async function testCashAdvanceReport() {
  const response = await fetch(`${API_BASE}/reports/cash-advance`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Cash advance report generated | Total advances: ${data.report?.summary?.totalAdvances || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 6: Deductions Report
async function testDeductionsReport() {
  const today = moment().tz(TIMEZONE);
  const startDate = today.clone().subtract(30, 'days').format('YYYY-MM-DD');
  const endDate = today.format('YYYY-MM-DD');

  const response = await fetch(`${API_BASE}/reports/deductions?startDate=${startDate}&endDate=${endDate}`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Deductions report generated | Total deductions: ${data.report?.summary?.totalDeductions || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 7: Reports Summary
async function testReportsSummary() {
  const response = await fetch(`${API_BASE}/reports/summary`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Reports summary retrieved | Has current week data: ${!!data.summary?.currentWeek}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 8: Archive Statistics
async function testArchiveStatistics() {
  const response = await fetch(`${API_BASE}/archive/statistics`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Archive stats retrieved | Payroll count: ${data.statistics?.payroll?.count || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 9: Get Archived Payrolls
async function testGetArchivedPayrolls() {
  const response = await fetch(`${API_BASE}/archive/payroll`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Archived payrolls retrieved | Count: ${data.count || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 10: Get Archived Attendances
async function testGetArchivedAttendances() {
  const response = await fetch(`${API_BASE}/archive/attendance`);
  const data = await response.json();

  if (response.status === 200 && data.success) {
    return {
      success: true,
      message: `Archived attendances retrieved | Count: ${data.count || 0}`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | ${data.message || 'Unknown error'}`
  };
}

// Test 11: Archive Endpoint Validation (should reject missing params)
async function testArchiveValidation() {
  const response = await fetch(`${API_BASE}/archive/payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // Missing beforeDate
  });
  const data = await response.json();

  // Should return 400 (bad request) for missing params
  if (response.status === 400 && !data.success) {
    return {
      success: true,
      message: `Archive validation working | Correctly rejected missing params`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | Expected 400 validation error`
  };
}

// Test 12: Restore Endpoint Validation
async function testRestoreValidation() {
  const response = await fetch(`${API_BASE}/archive/restore/payroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) // Missing startDate and endDate
  });
  const data = await response.json();

  // Should return 400 (bad request) for missing params
  if (response.status === 400 && !data.success) {
    return {
      success: true,
      message: `Restore validation working | Correctly rejected missing params`
    };
  }

  return {
    success: false,
    message: `Status: ${response.status} | Expected 400 validation error`
  };
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     PHASE 3 COMPREHENSIVE TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}     Reports & Archive Functionality${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  const startTime = Date.now();

  // Reports Tests
  console.log(`\n${colors.yellow}━━━ REPORTS TESTS ━━━${colors.reset}`);
  await runTest('Test 1: Weekly Payroll Report', testWeeklyPayrollReport);
  await runTest('Test 2: Monthly Payroll Report', testMonthlyPayrollReport);
  await runTest('Test 3: Employee Report (YTD)', testEmployeeReport);
  await runTest('Test 4: Attendance Report', testAttendanceReport);
  await runTest('Test 5: Cash Advance Report', testCashAdvanceReport);
  await runTest('Test 6: Deductions Report', testDeductionsReport);
  await runTest('Test 7: Reports Summary', testReportsSummary);

  // Archive Tests
  console.log(`\n${colors.yellow}━━━ ARCHIVE TESTS ━━━${colors.reset}`);
  await runTest('Test 8: Archive Statistics', testArchiveStatistics);
  await runTest('Test 9: Get Archived Payrolls', testGetArchivedPayrolls);
  await runTest('Test 10: Get Archived Attendances', testGetArchivedAttendances);
  await runTest('Test 11: Archive Validation', testArchiveValidation);
  await runTest('Test 12: Restore Validation', testRestoreValidation);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  const totalTests = passedTests + failedTests;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  console.log(`Total Tests:    ${totalTests}`);
  console.log(`${colors.green}Passed:         ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${failedTests}${colors.reset}`);
  console.log(`Pass Rate:      ${passRate}%`);
  console.log(`Duration:       ${duration}s\n`);

  // Print detailed results
  console.log(`${colors.yellow}Detailed Results:${colors.reset}`);
  testResults.forEach((result, index) => {
    const statusColor = result.status === 'PASSED' ? colors.green : colors.red;
    console.log(`  ${index + 1}. [${statusColor}${result.status}${colors.reset}] ${result.test}`);
    if (result.status !== 'PASSED') {
      console.log(`     ${colors.yellow}→${colors.reset} ${result.details}`);
    }
  });

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Exit code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});
