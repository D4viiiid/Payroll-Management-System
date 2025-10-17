/**
 * Phase 1 Comprehensive Test Suite - Simple Version (No External Dependencies)
 * Tests all Phase 1 features using only Node.js built-in modules
 */

const API_BASE = 'http://localhost:5000/api';
let testEmployeeId = null;
let testCashAdvanceId = null;
let testMandatoryDeductionId = null;
let testPayrollId = null;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

import http from 'http';
import https from 'https';

// Simple HTTP request function
async function request(method, url, data = null) {
  const urlObj = new URL(url);
  const options = {
    method,
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname + urlObj.search,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (err) => {
      info(`Request error: ${err.message}`);
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Utility functions
const success = (msg) => console.log('✅ ' + msg);
const error = (msg) => console.log('❌ ' + msg);
const info = (msg) => console.log('ℹ️  ' + msg);
const section = (msg) => console.log('\n' + '='.repeat(60) + '\n' + msg + '\n' + '='.repeat(60));

const recordTest = (name, passed, details = '') => {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    success(`${name} ${details}`);
  } else {
    testResults.failed++;
    error(`${name} ${details}`);
  }
};

// Test functions
async function test1_SeedMandatoryDeductions() {
  section('TEST 1: Seed Default Mandatory Deductions');
  try {
    const response = await request('POST', `${API_BASE}/mandatory-deductions/seed/defaults`);
    
    if (response.status === 201) {
      recordTest('Seed Mandatory Deductions', true, `- Created ${response.data.created?.length || 0} deductions`);
      
      if (response.data.created && response.data.created.length > 0) {
        testMandatoryDeductionId = response.data.created[0]._id;
        info(`Sample Deduction ID: ${testMandatoryDeductionId}`);
        
        response.data.created.forEach(deduction => {
          info(`  - ${deduction.name}: ${deduction.percentageRate ? deduction.percentageRate + '%' : '₱' + deduction.fixedAmount}`);
        });
      }
      return true;
    } else if (response.status === 200 || (response.status === 400 && response.data.message?.includes('already exist'))) {
      recordTest('Seed Mandatory Deductions', true, '- Deductions already exist');
      
      // Get existing deductions
      try {
        const getResponse = await request('GET', `${API_BASE}/mandatory-deductions?isActive=true`);
        if (getResponse.data.deductions && getResponse.data.deductions.length > 0) {
          testMandatoryDeductionId = getResponse.data.deductions[0]._id;
          info(`Using existing deduction ID: ${testMandatoryDeductionId}`);
        }
      } catch (getErr) {
        error('Failed to get existing deductions');
      }
      
      return true;
    }
    
    recordTest('Seed Mandatory Deductions', false, `- Status: ${response.status}`);
    return false;
  } catch (err) {
    recordTest('Seed Mandatory Deductions', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test2_GetMandatoryDeductions() {
  section('TEST 2: Get All Mandatory Deductions');
  try {
    const response = await request('GET', `${API_BASE}/mandatory-deductions`);
    recordTest('Get All Deductions', response.status === 200, 
      `- Found ${response.data.deductions?.length || 0} deductions`);
    
    if (response.data.deductions) {
      response.data.deductions.forEach(deduction => {
        info(`  - ${deduction.name} (${deduction.type}): ${deduction.isActive ? 'Active' : 'Inactive'}`);
      });
    }
    
    return true;
  } catch (err) {
    recordTest('Get All Deductions', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test3_CreateTestEmployee() {
  section('TEST 3: Create Test Employee with Salary Rates');
  try {
    const employeeData = {
      employeeId: `TEST-${Date.now()}`,
      firstName: 'Phase1',
      lastName: 'TestEmployee',
      email: `phase1test${Date.now()}@test.com`,
      contactNumber: '09123456789',
      hireDate: new Date().toISOString(),
      status: 'regular',
      position: 'Test Position',
      employmentType: 'Regular',
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94
    };
    
    const response = await request('POST', `${API_BASE}/employees`, employeeData);
    
    if (response.status === 201) {
      testEmployeeId = response.data._id;
      recordTest('Create Employee with Salary Rates', true, `- Employee ID: ${response.data.employeeId}`);
      
      info(`  Employee MongoDB ID: ${testEmployeeId}`);
      info(`  Employment Type: ${response.data.employmentType}`);
      info(`  Daily Rate: ₱${response.data.dailyRate}`);
      info(`  Hourly Rate: ₱${response.data.hourlyRate}`);
      info(`  Overtime Rate: ₱${response.data.overtimeRate}`);
      
      return true;
    }
    
    recordTest('Create Employee with Salary Rates', false, `- Status: ${response.status}, Message: ${response.data.message}`);
    return false;
  } catch (err) {
    recordTest('Create Employee with Salary Rates', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test4_ValidateCashAdvanceLimit() {
  section('TEST 4: Validate Cash Advance ₱1,100 Limit');
  if (!testEmployeeId) {
    recordTest('Validate Cash Advance Limit', false, '- No test employee created');
    return false;
  }
  
  try {
    // Try to create a cash advance exceeding ₱1,100
    const cashAdvanceData = {
      employee: testEmployeeId,
      amount: 1200,
      reason: 'Test limit validation',
      requestDate: new Date().toISOString()
    };
    
    const response = await request('POST', `${API_BASE}/cash-advance`, cashAdvanceData);
    
    info(`Response status: ${response.status}`);
    info(`Response message: ${JSON.stringify(response.data)}`);
    
    // We expect this to fail with 400
    if (response.status === 400) {
      recordTest('Validate Cash Advance Limit', true, '- Correctly rejected ₱1,200 (exceeds ₱1,100 limit)');
      return true;
    }
    
    recordTest('Validate Cash Advance Limit', false, `- Limit validation failed (got status ${response.status}, expected 400)`);
    return false;
  } catch (err) {
    recordTest('Validate Cash Advance Limit', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test5_CreateCashAdvanceRequest() {
  section('TEST 5: Create Valid Cash Advance Request');
  if (!testEmployeeId) {
    recordTest('Create Cash Advance Request', false, '- No test employee created');
    return false;
  }
  
  try {
    const cashAdvanceData = {
      employee: testEmployeeId,
      amount: 1000,
      reason: 'Emergency expenses',
      requestDate: new Date().toISOString()
    };
    
    const response = await request('POST', `${API_BASE}/cash-advance`, cashAdvanceData);
    
    if (response.status === 201 && response.data.advance) {
      const advance = response.data.advance;
      testCashAdvanceId = advance._id;
      recordTest('Create Cash Advance Request', true, `- Amount: ₱${advance.amount}`);
      
      info(`  Cash Advance ID: ${testCashAdvanceId}`);
      info(`  Status: ${advance.status}`);
      info(`  Remaining Balance: ₱${advance.remainingBalance}`);
      
      return true;
    }
    
    recordTest('Create Cash Advance Request', false, `- Status: ${response.status}`);
    return false;
  } catch (err) {
    recordTest('Create Cash Advance Request', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test6_ApproveCashAdvance() {
  section('TEST 6: Approve Cash Advance');
  if (!testCashAdvanceId) {
    recordTest('Approve Cash Advance', false, '- No cash advance created');
    return false;
  }
  
  try {
    // Use the test employee ID as approver (since approvedBy expects ObjectId)
    const response = await request('PUT', 
      `${API_BASE}/cash-advance/${testCashAdvanceId}/approve`,
      {
        approvedBy: testEmployeeId, // Use employee ObjectId
        notes: 'Approved for testing'
      }
    );
    
    info(`Response status: ${response.status}`);
    
    if (response.status === 200) {
      const approvedAdvance = response.data.advance || response.data;
      recordTest('Approve Cash Advance', true, `- Status: ${approvedAdvance.status}`);
      info(`  Approved By: ${approvedAdvance.approvedBy}`);
      return true;
    }
    
    info(`Response data: ${JSON.stringify(response.data)}`);
    recordTest('Approve Cash Advance', false, `- Status: ${response.status}, Message: ${response.data.message}`);
    return false;
  } catch (err) {
    recordTest('Approve Cash Advance', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test7_CalculateDeduction() {
  section('TEST 7: Calculate Mandatory Deduction');
  if (!testMandatoryDeductionId) {
    recordTest('Calculate Mandatory Deduction', false, '- No deduction available');
    return false;
  }
  
  try {
    const response = await request('POST', `${API_BASE}/mandatory-deductions/calculate`, {
      deductionId: testMandatoryDeductionId,
      grossSalary: 5000,
      employmentType: 'Regular'
    });
    
    if (response.status === 200) {
      recordTest('Calculate Mandatory Deduction', true, `- Amount: ₱${response.data.amount}`);
      
      info(`  Deduction: ${response.data.deductionName}`);
      info(`  Gross Salary: ₱${response.data.grossSalary}`);
      info(`  Calculated Amount: ₱${response.data.amount}`);
      
      return true;
    }
    
    recordTest('Calculate Mandatory Deduction', false, `- Status: ${response.status}`);
    return false;
  } catch (err) {
    recordTest('Calculate Mandatory Deduction', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test8_CalculatePayroll() {
  section('TEST 8: Calculate Payroll for Employee');
  if (!testEmployeeId) {
    recordTest('Calculate Payroll', false, '- No test employee created');
    return false;
  }
  
  try {
    info('Creating test attendance records...');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    // Create attendance for 3 days
    for (let i = 0; i < 3; i++) {
      const attendanceDate = new Date(startOfWeek);
      attendanceDate.setDate(startOfWeek.getDate() + i);
      
      try {
        await request('POST', `${API_BASE}/attendance`, {
          employeeId: testEmployeeId,
          date: attendanceDate.toISOString(),
          timeIn: '08:30:00',
          timeOut: '17:00:00',
          status: 'Present'
        });
      } catch (err) {
        // Attendance might already exist
      }
    }
    
    info('Calculating payroll...');
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    info(`Pay period: ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`);
    info(`Employee ID: ${testEmployeeId}`);
    
    const response = await request('POST',
      `${API_BASE}/enhanced-payroll/calculate/${testEmployeeId}`,
      {
        startDate: startOfWeek.toISOString(), // Changed from payPeriodStart
        endDate: endOfWeek.toISOString()       // Changed from payPeriodEnd
      }
    );
    
    info(`Response status: ${response.status}`);
    info(`Response data: ${JSON.stringify(response.data)}`);
    
    if (response.status === 200 || response.status === 201) {
      const payrollData = response.data.payroll || response.data;
      testPayrollId = payrollData._id;
      
      if (!testPayrollId) {
        // Payroll calculation returned success but didn't save - create the record
        info('Payroll calculated but not saved. Creating payroll record...');
        const createResponse = await request('POST', `${API_BASE}/enhanced-payroll`, payrollData);
        if (createResponse.status === 201 && createResponse.data.payroll) {
          testPayrollId = createResponse.data.payroll._id;
          info(`Created payroll record with ID: ${testPayrollId}`);
        }
      }
      
      recordTest('Calculate Payroll', true, `- Net Salary: ₱${payrollData.netSalary?.toFixed(2)}`);
      
      info(`  Payroll ID: ${testPayrollId || 'Not saved'}`);
      info(`  Work Days: ${payrollData.workDays}`);
      info(`  Basic Salary: ₱${payrollData.basicSalary?.toFixed(2)}`);
      info(`  Gross Salary: ₱${payrollData.grossSalary?.toFixed(2)}`);
      info(`  Total Deductions: ₱${payrollData.totalDeductions?.toFixed(2)}`);
      
      return true;
    }
    
    recordTest('Calculate Payroll', false, `- Status: ${response.status}, Message: ${response.data.message}`);
    return false;
  } catch (err) {
    recordTest('Calculate Payroll', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test9_UpdatePayrollStatus() {
  section('TEST 9: Update Payroll Status');
  if (!testPayrollId) {
    recordTest('Update Payroll Status', false, '- No payroll record created');
    return false;
  }
  
  try {
    const statuses = ['Processed', 'Approved', 'Paid'];
    
    for (const status of statuses) {
      info(`Updating status to: ${status}`);
      const response = await request('PUT',
        `${API_BASE}/enhanced-payroll/${testPayrollId}/status`,
        { status }
      );
      
      // Fix: The API returns response.data.payroll.status, not response.data.status
      if (response.data.payroll?.status !== status) {
        recordTest('Update Payroll Status', false, `- Failed to update to ${status}`);
        return false;
      }
      success(`  → Successfully updated to ${status}`);
    }
    
    recordTest('Update Payroll Status', true, '- All status transitions successful');
    return true;
  } catch (err) {
    recordTest('Update Payroll Status', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test10_GetPayslipData() {
  section('TEST 10: Get Payslip Data');
  if (!testPayrollId) {
    recordTest('Get Payslip Data', false, '- No payroll record created');
    return false;
  }
  
  try {
    const response = await request('GET', `${API_BASE}/enhanced-payroll/${testPayrollId}/payslip`);
    
    if (response.status === 200) {
      recordTest('Get Payslip Data', true, `- Payslip generated`);
      
      info(`  Employee: ${response.data.employee?.firstName} ${response.data.employee?.lastName}`);
      info(`  Net Pay: ₱${response.data.netPay?.toFixed(2)}`);
      
      return true;
    }
    
    recordTest('Get Payslip Data', false, `- Status: ${response.status}`);
    return false;
  } catch (err) {
    recordTest('Get Payslip Data', false, `- Error: ${err.message}`);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  PHASE 1 COMPREHENSIVE TEST SUITE');
  console.log('  Testing all Phase 1 features');
  console.log('='.repeat(60) + '\n');
  
  const startTime = Date.now();
  
  // Run all tests sequentially
  await test1_SeedMandatoryDeductions();
  await test2_GetMandatoryDeductions();
  await test3_CreateTestEmployee();
  await test4_ValidateCashAdvanceLimit();
  await test5_CreateCashAdvanceRequest();
  await test6_ApproveCashAdvance();
  await test7_CalculateDeduction();
  await test8_CalculatePayroll();
  await test9_UpdatePayrollStatus();
  await test10_GetPayslipData();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed: ${testResults.passed}`);
  console.log(`  ❌ Failed: ${testResults.failed}`);
  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log('='.repeat(60) + '\n');
  
  // Print failed tests details
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  • ${test.name}`);
        if (test.details) {
          console.log(`    ${test.details}`);
        }
      });
    console.log('');
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  console.error('\n❌ Test suite failed to run:', err);
  process.exit(1);
});
