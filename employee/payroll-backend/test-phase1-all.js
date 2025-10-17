import axios from 'axios';
import chalk from 'chalk';

const API_BASE = 'http://localhost:5000/api';
let testEmployeeId = null;
let testCashAdvanceId = null;
let testMandatoryDeductionId = null;
let testPayrollId = null;

// Utility functions
const success = (msg) => console.log(chalk.green('✅ ' + msg));
const error = (msg) => console.log(chalk.red('❌ ' + msg));
const info = (msg) => console.log(chalk.blue('ℹ️  ' + msg));
const section = (msg) => console.log(chalk.yellow('\n' + '='.repeat(60) + '\n' + msg + '\n' + '='.repeat(60)));

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

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
    const response = await axios.post(`${API_BASE}/mandatory-deductions/seed/defaults`);
    recordTest('Seed Mandatory Deductions', response.status === 201, 
      `- Created ${response.data.created?.length || 0} deductions`);
    
    if (response.data.created && response.data.created.length > 0) {
      testMandatoryDeductionId = response.data.created[0]._id;
      info(`Sample Deduction ID: ${testMandatoryDeductionId}`);
      
      response.data.created.forEach(deduction => {
        info(`  - ${deduction.name}: ${deduction.percentageRate ? deduction.percentageRate + '%' : '₱' + deduction.fixedAmount}`);
      });
    }
    
    return true;
  } catch (err) {
    if (err.response?.data?.message?.includes('already exist')) {
      recordTest('Seed Mandatory Deductions', true, '- Deductions already exist');
      
      // Get existing deductions
      try {
        const getResponse = await axios.get(`${API_BASE}/mandatory-deductions?isActive=true`);
        if (getResponse.data.deductions && getResponse.data.deductions.length > 0) {
          testMandatoryDeductionId = getResponse.data.deductions[0]._id;
          info(`Using existing deduction ID: ${testMandatoryDeductionId}`);
        }
      } catch (getErr) {
        error('Failed to get existing deductions');
      }
      
      return true;
    }
    recordTest('Seed Mandatory Deductions', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test2_GetMandatoryDeductions() {
  section('TEST 2: Get All Mandatory Deductions');
  try {
    const response = await axios.get(`${API_BASE}/mandatory-deductions`);
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
      phoneNo: '09123456789',
      dob: '1995-01-15',
      gender: 'Male',
      address: '123 Test Street',
      city: 'Test City',
      zip: '1234',
      status: 'regular',
      position: 'Test Position',
      employmentType: 'Regular',
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94
    };
    
    const response = await axios.post(`${API_BASE}/employees`, employeeData);
    testEmployeeId = response.data._id;
    
    recordTest('Create Employee with Salary Rates', response.status === 201, 
      `- Employee ID: ${response.data.employeeId}`);
    
    info(`  Employee MongoDB ID: ${testEmployeeId}`);
    info(`  Employment Type: ${response.data.employmentType}`);
    info(`  Daily Rate: ₱${response.data.dailyRate}`);
    info(`  Hourly Rate: ₱${response.data.hourlyRate}`);
    info(`  Overtime Rate: ₱${response.data.overtimeRate}`);
    
    return true;
  } catch (err) {
    recordTest('Create Employee with Salary Rates', false, 
      `- Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function test4_UpdateEmployeeSalaryRates() {
  section('TEST 4: Update Employee Salary Rates');
  if (!testEmployeeId) {
    recordTest('Update Employee Salary Rates', false, '- No test employee created');
    return false;
  }
  
  try {
    const updateData = {
      employmentType: 'On-Call',
      dailyRate: 600,
      hourlyRate: 75,
      overtimeRate: 93.75
    };
    
    const response = await axios.put(`${API_BASE}/employees/${testEmployeeId}`, updateData);
    
    recordTest('Update Employee Salary Rates', response.status === 200, 
      `- Updated to ${response.data.employmentType}`);
    
    info(`  New Daily Rate: ₱${response.data.dailyRate}`);
    info(`  New Hourly Rate: ₱${response.data.hourlyRate}`);
    info(`  New Overtime Rate: ₱${response.data.overtimeRate}`);
    
    return true;
  } catch (err) {
    recordTest('Update Employee Salary Rates', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test5_CreateCashAdvanceRequest() {
  section('TEST 5: Create Cash Advance Request');
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
    
    const response = await axios.post(`${API_BASE}/cash-advance`, cashAdvanceData);
    testCashAdvanceId = response.data._id;
    
    recordTest('Create Cash Advance Request', response.status === 201, 
      `- Amount: ₱${response.data.amount}`);
    
    info(`  Cash Advance ID: ${testCashAdvanceId}`);
    info(`  Status: ${response.data.status}`);
    info(`  Remaining Balance: ₱${response.data.remainingBalance}`);
    
    return true;
  } catch (err) {
    recordTest('Create Cash Advance Request', false, 
      `- Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function test6_ValidateCashAdvanceLimit() {
  section('TEST 6: Validate Cash Advance ₱1,100 Limit');
  if (!testEmployeeId) {
    recordTest('Validate Cash Advance Limit', false, '- No test employee created');
    return false;
  }
  
  try {
    // Try to create a cash advance exceeding ₱1,100
    const cashAdvanceData = {
      employee: testEmployeeId,
      amount: 1200, // Exceeds limit
      reason: 'Test limit validation',
      requestDate: new Date().toISOString()
    };
    
    await axios.post(`${API_BASE}/cash-advance`, cashAdvanceData);
    
    // If we reach here, validation failed
    recordTest('Validate Cash Advance Limit', false, '- Limit validation failed (should reject ₱1,200)');
    return false;
  } catch (err) {
    // We expect this to fail
    if (err.response?.status === 400 && err.response?.data?.message?.includes('1100')) {
      recordTest('Validate Cash Advance Limit', true, '- Correctly rejected ₱1,200 (exceeds ₱1,100 limit)');
      return true;
    }
    recordTest('Validate Cash Advance Limit', false, `- Unexpected error: ${err.message}`);
    return false;
  }
}

async function test7_ApproveCashAdvance() {
  section('TEST 7: Approve Cash Advance');
  if (!testCashAdvanceId) {
    recordTest('Approve Cash Advance', false, '- No cash advance created');
    return false;
  }
  
  try {
    const response = await axios.put(
      `${API_BASE}/cash-advance/${testCashAdvanceId}/approve`,
      {
        approvedBy: 'Admin User',
        approvalDate: new Date().toISOString()
      }
    );
    
    recordTest('Approve Cash Advance', response.status === 200, 
      `- Status: ${response.data.status}`);
    
    info(`  Approved By: ${response.data.approvedBy}`);
    info(`  Approval Date: ${new Date(response.data.approvalDate).toLocaleString()}`);
    
    return true;
  } catch (err) {
    recordTest('Approve Cash Advance', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test8_CalculateDeduction() {
  section('TEST 8: Calculate Mandatory Deduction');
  if (!testMandatoryDeductionId) {
    recordTest('Calculate Mandatory Deduction', false, '- No deduction available');
    return false;
  }
  
  try {
    const response = await axios.post(`${API_BASE}/mandatory-deductions/calculate`, {
      deductionId: testMandatoryDeductionId,
      grossSalary: 5000,
      employmentType: 'Regular'
    });
    
    recordTest('Calculate Mandatory Deduction', response.status === 200, 
      `- Amount: ₱${response.data.amount}`);
    
    info(`  Deduction: ${response.data.deductionName}`);
    info(`  Gross Salary: ₱${response.data.grossSalary}`);
    info(`  Calculated Amount: ₱${response.data.amount}`);
    
    return true;
  } catch (err) {
    recordTest('Calculate Mandatory Deduction', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test9_CalculatePayrollForEmployee() {
  section('TEST 9: Calculate Payroll for Employee');
  if (!testEmployeeId) {
    recordTest('Calculate Payroll for Employee', false, '- No test employee created');
    return false;
  }
  
  try {
    // Create some test attendance records first
    info('Creating test attendance records...');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    // Create 3 days of attendance
    for (let i = 0; i < 3; i++) {
      const attendanceDate = new Date(startOfWeek);
      attendanceDate.setDate(startOfWeek.getDate() + i);
      
      try {
        await axios.post(`${API_BASE}/attendance`, {
          employeeId: testEmployeeId,
          date: attendanceDate.toISOString(),
          timeIn: '08:30:00',
          timeOut: '17:00:00',
          status: 'Present'
        });
      } catch (err) {
        // Attendance might already exist, that's okay
      }
    }
    
    info('Calculating payroll...');
    const response = await axios.post(
      `${API_BASE}/enhanced-payroll/calculate/${testEmployeeId}`,
      {
        payPeriodStart: startOfWeek.toISOString(),
        payPeriodEnd: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
    
    testPayrollId = response.data._id;
    
    recordTest('Calculate Payroll for Employee', response.status === 200 || response.status === 201, 
      `- Net Salary: ₱${response.data.netSalary?.toFixed(2)}`);
    
    info(`  Payroll ID: ${testPayrollId}`);
    info(`  Pay Period: ${new Date(response.data.payPeriodStart).toLocaleDateString()} - ${new Date(response.data.payPeriodEnd).toLocaleDateString()}`);
    info(`  Work Days: ${response.data.workDays}`);
    info(`  Basic Salary: ₱${response.data.basicSalary?.toFixed(2)}`);
    info(`  Gross Salary: ₱${response.data.grossSalary?.toFixed(2)}`);
    info(`  Total Deductions: ₱${response.data.totalDeductions?.toFixed(2)}`);
    info(`  Net Salary: ₱${response.data.netSalary?.toFixed(2)}`);
    
    return true;
  } catch (err) {
    recordTest('Calculate Payroll for Employee', false, 
      `- Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function test10_GetPayrollSummary() {
  section('TEST 10: Get Payroll Summary');
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    const response = await axios.get(
      `${API_BASE}/enhanced-payroll/summary/period`,
      {
        params: {
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString()
        }
      }
    );
    
    recordTest('Get Payroll Summary', response.status === 200, 
      `- Found ${response.data.employeeCount || 0} employees`);
    
    if (response.data.totalGrossSalary !== undefined) {
      info(`  Total Gross Salary: ₱${response.data.totalGrossSalary.toFixed(2)}`);
      info(`  Total Deductions: ₱${response.data.totalDeductions.toFixed(2)}`);
      info(`  Total Net Salary: ₱${response.data.totalNetSalary.toFixed(2)}`);
    }
    
    return true;
  } catch (err) {
    recordTest('Get Payroll Summary', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test11_UpdatePayrollStatus() {
  section('TEST 11: Update Payroll Status Workflow');
  if (!testPayrollId) {
    recordTest('Update Payroll Status', false, '- No payroll record created');
    return false;
  }
  
  try {
    // Test status progression: Draft → Processed → Approved → Paid
    const statuses = ['Processed', 'Approved', 'Paid'];
    
    for (const status of statuses) {
      info(`Updating status to: ${status}`);
      const response = await axios.put(
        `${API_BASE}/enhanced-payroll/${testPayrollId}/status`,
        { status }
      );
      
      if (response.data.status === status) {
        success(`  → Successfully updated to ${status}`);
      } else {
        error(`  → Failed to update to ${status}`);
        recordTest('Update Payroll Status', false, `- Status update to ${status} failed`);
        return false;
      }
    }
    
    recordTest('Update Payroll Status', true, '- All status transitions successful');
    return true;
  } catch (err) {
    recordTest('Update Payroll Status', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test12_GetEmployeeYTD() {
  section('TEST 12: Get Employee Year-to-Date (YTD)');
  if (!testEmployeeId) {
    recordTest('Get Employee YTD', false, '- No test employee created');
    return false;
  }
  
  try {
    const currentYear = new Date().getFullYear();
    const response = await axios.get(
      `${API_BASE}/enhanced-payroll/ytd/${testEmployeeId}/${currentYear}`
    );
    
    recordTest('Get Employee YTD', response.status === 200, 
      `- YTD Net Salary: ₱${response.data.yearToDateNet?.toFixed(2) || 0}`);
    
    info(`  YTD Gross: ₱${response.data.yearToDateGross?.toFixed(2) || 0}`);
    info(`  YTD Deductions: ₱${response.data.yearToDateDeductions?.toFixed(2) || 0}`);
    info(`  YTD Net: ₱${response.data.yearToDateNet?.toFixed(2) || 0}`);
    
    return true;
  } catch (err) {
    recordTest('Get Employee YTD', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test13_GetPayslipData() {
  section('TEST 13: Get Payslip Data');
  if (!testPayrollId) {
    recordTest('Get Payslip Data', false, '- No payroll record created');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_BASE}/enhanced-payroll/${testPayrollId}/payslip`
    );
    
    recordTest('Get Payslip Data', response.status === 200, 
      `- Payslip generated for ${response.data.employee?.firstName}`);
    
    info(`  Employee: ${response.data.employee?.firstName} ${response.data.employee?.lastName}`);
    info(`  Pay Period: ${new Date(response.data.payPeriod?.start).toLocaleDateString()} - ${new Date(response.data.payPeriod?.end).toLocaleDateString()}`);
    info(`  Net Pay: ₱${response.data.netPay?.toFixed(2)}`);
    
    return true;
  } catch (err) {
    recordTest('Get Payslip Data', false, `- Error: ${err.message}`);
    return false;
  }
}

async function test14_IntegrationTest() {
  section('TEST 14: Full Integration Test');
  
  try {
    info('Testing complete workflow: Employee → Attendance → Payroll → Payment');
    
    // 1. Create employee
    const employeeData = {
      employeeId: `INT-${Date.now()}`,
      firstName: 'Integration',
      lastName: 'TestUser',
      email: `integration${Date.now()}@test.com`,
      phoneNo: '09123456789',
      dob: '1990-05-20',
      gender: 'Female',
      address: '456 Integration Street',
      city: 'Test City',
      zip: '5678',
      status: 'regular',
      position: 'Integration Tester',
      employmentType: 'Regular',
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94
    };
    
    const empResponse = await axios.post(`${API_BASE}/employees`, employeeData);
    const integrationEmployeeId = empResponse.data._id;
    success('Step 1: Created employee');
    
    // 2. Create attendance records (5 days)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    for (let i = 0; i < 5; i++) {
      const attendanceDate = new Date(startOfWeek);
      attendanceDate.setDate(startOfWeek.getDate() + i);
      
      try {
        await axios.post(`${API_BASE}/attendance`, {
          employeeId: integrationEmployeeId,
          date: attendanceDate.toISOString(),
          timeIn: '08:00:00',
          timeOut: '17:00:00',
          status: 'Present'
        });
      } catch (err) {
        // Attendance might exist
      }
    }
    success('Step 2: Created attendance records (5 days)');
    
    // 3. Request cash advance
    const cashAdvanceResponse = await axios.post(`${API_BASE}/cash-advance`, {
      employee: integrationEmployeeId,
      amount: 500,
      reason: 'Integration test advance',
      requestDate: new Date().toISOString()
    });
    const integrationCashAdvanceId = cashAdvanceResponse.data._id;
    success('Step 3: Requested cash advance (₱500)');
    
    // 4. Approve cash advance
    await axios.put(
      `${API_BASE}/cash-advance/${integrationCashAdvanceId}/approve`,
      {
        approvedBy: 'Integration Admin',
        approvalDate: new Date().toISOString()
      }
    );
    success('Step 4: Approved cash advance');
    
    // 5. Calculate payroll
    const payrollResponse = await axios.post(
      `${API_BASE}/enhanced-payroll/calculate/${integrationEmployeeId}`,
      {
        payPeriodStart: startOfWeek.toISOString(),
        payPeriodEnd: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
    const integrationPayrollId = payrollResponse.data._id;
    success('Step 5: Calculated payroll');
    
    info(`  Basic Salary: ₱${payrollResponse.data.basicSalary?.toFixed(2)}`);
    info(`  Total Deductions: ₱${payrollResponse.data.totalDeductions?.toFixed(2)}`);
    info(`  Net Salary: ₱${payrollResponse.data.netSalary?.toFixed(2)}`);
    
    // 6. Process payroll
    await axios.put(
      `${API_BASE}/enhanced-payroll/${integrationPayrollId}/status`,
      { status: 'Processed' }
    );
    success('Step 6: Processed payroll');
    
    // 7. Approve payroll
    await axios.put(
      `${API_BASE}/enhanced-payroll/${integrationPayrollId}/status`,
      { status: 'Approved' }
    );
    success('Step 7: Approved payroll');
    
    // 8. Mark as paid
    await axios.put(
      `${API_BASE}/enhanced-payroll/${integrationPayrollId}/status`,
      { status: 'Paid' }
    );
    success('Step 8: Marked payroll as paid');
    
    recordTest('Full Integration Test', true, '- All 8 steps completed successfully');
    return true;
    
  } catch (err) {
    recordTest('Full Integration Test', false, 
      `- Error: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan('  PHASE 1 COMPREHENSIVE TEST SUITE'));
  console.log(chalk.cyan('  Testing all Phase 1 features'));
  console.log(chalk.cyan('='.repeat(60) + '\n'));
  
  const startTime = Date.now();
  
  // Run all tests sequentially
  await test1_SeedMandatoryDeductions();
  await test2_GetMandatoryDeductions();
  await test3_CreateTestEmployee();
  await test4_UpdateEmployeeSalaryRates();
  await test5_CreateCashAdvanceRequest();
  await test6_ValidateCashAdvanceLimit();
  await test7_ApproveCashAdvance();
  await test8_CalculateDeduction();
  await test9_CalculatePayrollForEmployee();
  await test10_GetPayrollSummary();
  await test11_UpdatePayrollStatus();
  await test12_GetEmployeeYTD();
  await test13_GetPayslipData();
  await test14_IntegrationTest();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan('  TEST SUMMARY'));
  console.log(chalk.cyan('='.repeat(60)));
  console.log(chalk.green(`  ✅ Passed: ${testResults.passed}`));
  console.log(chalk.red(`  ❌ Failed: ${testResults.failed}`));
  console.log(chalk.blue(`  ⏱️  Duration: ${duration}s`));
  console.log(chalk.cyan('='.repeat(60) + '\n'));
  
  // Print failed tests details
  if (testResults.failed > 0) {
    console.log(chalk.red('\n❌ FAILED TESTS:\n'));
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(chalk.red(`  • ${test.name}`));
        if (test.details) {
          console.log(chalk.gray(`    ${test.details}`));
        }
      });
    console.log('');
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  console.error(chalk.red('\n❌ Test suite failed to run:'), err);
  process.exit(1);
});
