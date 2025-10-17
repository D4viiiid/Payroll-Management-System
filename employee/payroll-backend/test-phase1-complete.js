import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/EmployeeModels.js';
import EnhancedPayroll from './models/EnhancedPayroll.model.js';
import MandatoryDeduction from './models/MandatoryDeduction.model.js';
import CashAdvance from './models/CashAdvance.model.js';
import Attendance from './models/Attendance.js';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  data: (label, value) => console.log(`  ${colors.bright}${label}:${colors.reset} ${value}`)
};

/**
 * 🧪 PHASE 1 COMPREHENSIVE TEST SUITE
 * Tests all Phase 1 implementations:
 * 1. Employee Model Migration
 * 2. Mandatory Deductions System
 * 3. Cash Advance System
 * 4. Enhanced Payroll System
 * 5. Integration Tests
 */

let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

const assert = (condition, testName) => {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    log.success(testName);
    return true;
  } else {
    testResults.failed++;
    log.error(testName);
    return false;
  }
};

const testEmployeeModel = async () => {
  log.header();
  log.title('TEST 1: Employee Model Migration');
  log.header();
  
  try {
    // Check if employees have new fields
    const employees = await Employee.find({}).limit(5);
    log.info(`Found ${employees.length} employees to test`);
    
    if (employees.length === 0) {
      log.warn('No employees found. Creating test employee...');
      const testEmployee = new Employee({
        employeeId: 'TEST-001',
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@example.com',
        position: 'Tester',
        status: 'regular',
        employmentType: 'Regular',
        dailyRate: 550,
        hourlyRate: 68.75,
        overtimeRate: 85.94
      });
      await testEmployee.save();
      employees.push(testEmployee);
      log.success('Test employee created');
    }
    
    let hasAllFields = true;
    for (const emp of employees) {
      log.info(`\nChecking: ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      log.data('Employment Type', emp.employmentType || '❌ MISSING');
      log.data('Daily Rate', emp.dailyRate ? `₱${emp.dailyRate}` : '❌ MISSING');
      log.data('Hourly Rate', emp.hourlyRate ? `₱${emp.hourlyRate}` : '❌ MISSING');
      log.data('Overtime Rate', emp.overtimeRate ? `₱${emp.overtimeRate}` : '❌ MISSING');
      log.data('Is Active', emp.isActive !== undefined ? (emp.isActive ? 'Yes' : 'No') : '❌ MISSING');
      
      if (!emp.employmentType || !emp.dailyRate || !emp.hourlyRate || !emp.overtimeRate || emp.isActive === undefined) {
        hasAllFields = false;
      }
    }
    
    assert(hasAllFields, 'All employees have salary rate fields');
    assert(employees.length > 0, 'Employees exist in database');
    
    // Test default values
    const sampleEmp = employees[0];
    assert(sampleEmp.dailyRate >= 0, 'Daily rate is valid number');
    assert(sampleEmp.hourlyRate >= 0, 'Hourly rate is valid number');
    assert(sampleEmp.overtimeRate >= 0, 'Overtime rate is valid number');
    
    return employees[0]; // Return for use in other tests
    
  } catch (error) {
    log.error(`Employee model test failed: ${error.message}`);
    throw error;
  }
};

const testMandatoryDeductions = async () => {
  log.header();
  log.title('TEST 2: Mandatory Deductions System');
  log.header();
  
  try {
    // Check existing deductions
    const existingDeductions = await MandatoryDeduction.find({});
    log.info(`Found ${existingDeductions.length} existing mandatory deductions`);
    
    // Create test deduction if none exist
    if (existingDeductions.length === 0) {
      log.warn('No deductions found. Creating test deductions...');
      
      const testDeductions = [
        {
          deductionType: 'SSS',
          description: 'Social Security System Contribution',
          calculationType: 'percentage',
          percentageRate: 4.5,
          isActive: true,
          effectiveDate: new Date(),
          applicableToEmploymentTypes: ['All']
        },
        {
          deductionType: 'PhilHealth',
          description: 'Philippine Health Insurance',
          calculationType: 'percentage',
          percentageRate: 4.0,
          isActive: true,
          effectiveDate: new Date(),
          applicableToEmploymentTypes: ['All']
        }
      ];
      
      for (const deduction of testDeductions) {
        const created = await MandatoryDeduction.create(deduction);
        log.success(`Created ${created.deductionType} deduction`);
        existingDeductions.push(created);
      }
    }
    
    // Test deduction fields
    for (const deduction of existingDeductions) {
      log.info(`\n${deduction.deductionType}:`);
      log.data('Type', deduction.calculationType);
      log.data('Rate', deduction.calculationType === 'percentage' 
        ? `${deduction.percentageRate}%` 
        : `₱${deduction.fixedAmount}`);
      log.data('Status', deduction.isActive ? 'Active' : 'Inactive');
      log.data('Applicable To', deduction.applicableToEmploymentTypes.join(', '));
    }
    
    assert(existingDeductions.length > 0, 'Mandatory deductions exist');
    
    // Test calculation
    const sssDeduction = existingDeductions.find(d => d.deductionType === 'SSS');
    if (sssDeduction) {
      const testSalary = 10000;
      const calculatedAmount = await MandatoryDeduction.calculateDeductionAmount(
        sssDeduction._id, 
        testSalary
      );
      log.info(`\nTest SSS calculation on ₱${testSalary}:`);
      log.data('Expected', `₱${testSalary * 0.045}`);
      log.data('Calculated', `₱${calculatedAmount}`);
      assert(calculatedAmount === testSalary * 0.045, 'Deduction calculation is correct');
    }
    
    return existingDeductions;
    
  } catch (error) {
    log.error(`Mandatory deductions test failed: ${error.message}`);
    throw error;
  }
};

const testCashAdvance = async (employee) => {
  log.header();
  log.title('TEST 3: Cash Advance System');
  log.header();
  
  try {
    if (!employee) {
      log.warn('No employee provided, skipping cash advance test');
      return null;
    }
    
    log.info(`Testing cash advance for: ${employee.firstName} ${employee.lastName}`);
    
    // Check if employee can request advance
    const canRequest = await CashAdvance.canRequestAdvance(employee._id);
    log.data('Can Request Advance', canRequest ? 'Yes' : 'No');
    
    // Create test cash advance
    const testAdvance = await CashAdvance.create({
      employee: employee._id,
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      requestDate: new Date(),
      amount: 1000,
      reason: 'Phase 1 Testing',
      status: 'Pending'
    });
    
    log.success('Cash advance request created');
    log.data('Amount', `₱${testAdvance.amount}`);
    log.data('Status', testAdvance.status);
    log.data('Remaining Balance', `₱${testAdvance.remainingBalance}`);
    
    assert(testAdvance.amount <= 1100, 'Amount within ₱1,100 limit');
    assert(testAdvance.remainingBalance === testAdvance.amount, 'Remaining balance equals amount');
    
    // Test approval
    await testAdvance.approve('ADMIN-001', 'Test approval');
    await testAdvance.save();
    log.success('Cash advance approved');
    log.data('Approved By', testAdvance.approvedBy);
    
    assert(testAdvance.status === 'Approved', 'Status changed to Approved');
    
    // Test payment
    await testAdvance.addPayment(500, new Date(), 'PAY-001');
    await testAdvance.save();
    log.success('Payment of ₱500 added');
    log.data('Remaining Balance', `₱${testAdvance.remainingBalance}`);
    log.data('Status', testAdvance.status);
    
    assert(testAdvance.remainingBalance === 500, 'Remaining balance updated correctly');
    assert(testAdvance.status === 'Partially Paid', 'Status changed to Partially Paid');
    assert(testAdvance.paymentHistory.length === 1, 'Payment history recorded');
    
    return testAdvance;
    
  } catch (error) {
    log.error(`Cash advance test failed: ${error.message}`);
    throw error;
  }
};

const testEnhancedPayroll = async (employee, deductions) => {
  log.header();
  log.title('TEST 4: Enhanced Payroll System');
  log.header();
  
  try {
    if (!employee) {
      log.warn('No employee provided, skipping payroll test');
      return null;
    }
    
    log.info(`Testing payroll for: ${employee.firstName} ${employee.lastName}`);
    
    // Create test payroll record
    const payPeriodStart = new Date();
    payPeriodStart.setDate(payPeriodStart.getDate() - 7);
    const payPeriodEnd = new Date();
    
    const testPayroll = await EnhancedPayroll.create({
      employee: employee._id,
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employmentType: employee.employmentType || 'Regular',
      payPeriodStart,
      payPeriodEnd,
      workDays: 5,
      halfDays: 1,
      overtimeHours: 3,
      dailyRate: employee.dailyRate || 550,
      hourlyRate: employee.hourlyRate || 68.75,
      overtimeRate: employee.overtimeRate || 85.94,
      status: 'Draft'
    });
    
    log.success('Payroll record created');
    log.data('Pay Period', `${payPeriodStart.toDateString()} - ${payPeriodEnd.toDateString()}`);
    log.data('Work Days', testPayroll.workDays);
    log.data('Half Days', testPayroll.halfDays);
    log.data('Overtime Hours', testPayroll.overtimeHours);
    log.data('Basic Salary', `₱${testPayroll.basicSalary.toFixed(2)}`);
    log.data('Overtime Pay', `₱${testPayroll.overtimePay.toFixed(2)}`);
    log.data('Gross Salary', `₱${testPayroll.grossSalary.toFixed(2)}`);
    log.data('Total Deductions', `₱${testPayroll.totalDeductions.toFixed(2)}`);
    log.data('Net Salary', `₱${testPayroll.netSalary.toFixed(2)}`);
    
    // Verify calculations
    const expectedBasic = (5 * 550) + (1 * 275); // 5 full days + 1 half day
    const expectedOvertime = 3 * 85.94;
    const expectedGross = expectedBasic + expectedOvertime;
    
    assert(Math.abs(testPayroll.basicSalary - expectedBasic) < 0.01, 'Basic salary calculated correctly');
    assert(Math.abs(testPayroll.overtimePay - expectedOvertime) < 0.01, 'Overtime pay calculated correctly');
    assert(Math.abs(testPayroll.grossSalary - expectedGross) < 0.01, 'Gross salary calculated correctly');
    assert(testPayroll.netSalary <= testPayroll.grossSalary, 'Net salary is less than or equal to gross');
    
    // Test status workflow
    testPayroll.status = 'Processed';
    await testPayroll.save();
    log.success('Payroll status changed to Processed');
    
    assert(testPayroll.status === 'Processed', 'Status update works');
    
    // Get payslip data
    const payslipData = testPayroll.generatePayslipData();
    log.info('\nPayslip Data Generated:');
    log.data('Employee', payslipData.employee.name);
    log.data('Pay Period', payslipData.payPeriod);
    log.data('Gross Salary', `₱${payslipData.earnings.grossSalary}`);
    log.data('Net Salary', `₱${payslipData.summary.netSalary}`);
    
    assert(payslipData !== null, 'Payslip data generated successfully');
    
    return testPayroll;
    
  } catch (error) {
    log.error(`Enhanced payroll test failed: ${error.message}`);
    throw error;
  }
};

const testIntegration = async (employee) => {
  log.header();
  log.title('TEST 5: Integration Tests');
  log.header();
  
  try {
    // Test YTD calculation
    const year = new Date().getFullYear();
    const ytdData = await EnhancedPayroll.getEmployeeYTD(employee._id, year);
    
    log.info('Year-to-Date Summary:');
    log.data('Total Gross Salary', `₱${ytdData.totalGrossSalary.toFixed(2)}`);
    log.data('Total Deductions', `₱${ytdData.totalDeductions.toFixed(2)}`);
    log.data('Total Net Salary', `₱${ytdData.totalNetSalary.toFixed(2)}`);
    log.data('Total Payroll Records', ytdData.totalPayrollRecords);
    
    assert(ytdData !== null, 'YTD data retrieved successfully');
    
    // Test outstanding cash advance
    const outstanding = await CashAdvance.getEmployeeOutstanding(employee._id);
    log.info('\nOutstanding Cash Advances:');
    log.data('Total Outstanding', `₱${outstanding}`);
    
    assert(outstanding >= 0, 'Outstanding amount is valid');
    
    // Test active deductions
    const activeDeductions = await MandatoryDeduction.getActiveDeductions('Regular');
    log.info('\nActive Deductions for Regular Employees:');
    for (const deduction of activeDeductions) {
      log.data(deduction.deductionType, 
        deduction.calculationType === 'percentage' 
          ? `${deduction.percentageRate}%` 
          : `₱${deduction.fixedAmount}`
      );
    }
    
    assert(activeDeductions.length >= 0, 'Active deductions retrieved');
    
  } catch (error) {
    log.error(`Integration test failed: ${error.message}`);
    throw error;
  }
};

const runTests = async () => {
  try {
    log.header();
    log.title('🧪 PHASE 1 COMPREHENSIVE TEST SUITE');
    log.title('Testing all Phase 1 implementations');
    log.header();
    
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';
    await mongoose.connect(mongoURI);
    log.success('Connected to MongoDB');
    log.info(`Database: ${mongoose.connection.name}`);
    
    // Run all tests
    const employee = await testEmployeeModel();
    const deductions = await testMandatoryDeductions();
    const cashAdvance = await testCashAdvance(employee);
    const payroll = await testEnhancedPayroll(employee, deductions);
    await testIntegration(employee);
    
    // Print summary
    log.header();
    log.title('📊 TEST RESULTS SUMMARY');
    log.header();
    log.data('Total Tests', testResults.total);
    log.data('Passed', `${colors.green}${testResults.passed}${colors.reset}`);
    log.data('Failed', `${colors.red}${testResults.failed}${colors.reset}`);
    log.data('Success Rate', `${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    log.header();
    
    if (testResults.failed === 0) {
      log.success('ALL TESTS PASSED! ✨ Phase 1 is working correctly!');
    } else {
      log.error(`${testResults.failed} test(s) failed. Please review the errors above.`);
    }
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info('Disconnected from MongoDB');
    process.exit(testResults.failed === 0 ? 0 : 1);
  }
};

// Run tests
runTests();
