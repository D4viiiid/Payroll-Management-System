/**
 * Test Script: Hourly Rate Calculation for Partial Days
 * Tests the new requirement: Half-day + hourly rate for hours worked beyond 4
 */

import { 
  validateAndCalculateAttendance,
  calculateAttendanceSummary 
} from '../utils/attendanceCalculator.js';

console.log('🧪 Testing Hourly Rate Calculation for Partial Days\n');
console.log('=' .repeat(80));

// Test scenarios
const testScenarios = [
  {
    name: 'Scenario 1: 9:31 AM - 3:31 PM (5 hours)',
    timeIn: '09:31:00',
    timeOut: '15:31:00',
    date: '2025-10-16',
    expectedHours: 5, // 9:31 AM to 3:31 PM = 6 hours, minus 1 hour lunch = 5 hours
    expectedDayType: 'Half Day',
    expectedCalculation: {
      halfDayBase: 275,
      extraHours: 1, // 5 hours - 4 hours minimum
      hourlyRate: 68.75,
      additionalPay: 68.75,
      totalExpected: 343.75
    }
  },
  {
    name: 'Scenario 2: 9:45 AM - 4:00 PM (6 hours)',
    timeIn: '09:45:00',
    timeOut: '16:00:00',
    date: '2025-10-16',
    expectedHours: 5.25, // 9:45 AM to 4:00 PM = 6.25 hours, minus 1 hour lunch = 5.25 hours
    expectedDayType: 'Half Day',
    expectedCalculation: {
      halfDayBase: 275,
      extraHours: 1.25, // 5.25 hours - 4 hours minimum
      hourlyRate: 68.75,
      additionalPay: 85.94, // 1.25 × 68.75
      totalExpected: 360.94
    }
  },
  {
    name: 'Scenario 3: 10:00 AM - 4:30 PM (5.5 hours)',
    timeIn: '10:00:00',
    timeOut: '16:30:00',
    date: '2025-10-16',
    expectedHours: 5.5, // 10:00 AM to 4:30 PM = 6.5 hours, minus 1 hour lunch = 5.5 hours
    expectedDayType: 'Half Day',
    expectedCalculation: {
      halfDayBase: 275,
      extraHours: 1.5, // 5.5 hours - 4 hours minimum
      hourlyRate: 68.75,
      additionalPay: 103.13, // 1.5 × 68.75
      totalExpected: 378.13
    }
  },
  {
    name: 'Scenario 4: 9:31 AM - 2:31 PM (3.98 hours - Incomplete)',
    timeIn: '09:31:00',
    timeOut: '14:30:00',
    date: '2025-10-16',
    expectedHours: 3.98, // 9:31 AM to 2:30 PM = 4.98 hours, minus 1 hour lunch = 3.98 hours
    expectedDayType: 'Incomplete', // Less than 4 hours minimum
    expectedCalculation: {
      totalExpected: 0 // Incomplete day, no pay
    }
  },
  {
    name: 'Scenario 5: 9:31 AM - 2:32 PM (4.02 hours exactly - Half Day)',
    timeIn: '09:31:00',
    timeOut: '14:32:00',
    date: '2025-10-16',
    expectedHours: 4.02, // 9:31 AM to 2:32 PM = 5.02 hours, minus 1 hour lunch = 4.02 hours
    expectedDayType: 'Half Day',
    expectedCalculation: {
      halfDayBase: 275,
      extraHours: 0.02, // 4.02 hours - 4 hours minimum = 0.02
      hourlyRate: 68.75,
      additionalPay: 1.38, // 0.02 × 68.75
      totalExpected: 276.38 // Half-day base + tiny additional
    }
  },
  {
    name: 'Scenario 6: 9:00 AM - 5:00 PM (7 hours, Full Day)',
    timeIn: '09:00:00',
    timeOut: '17:00:00',
    date: '2025-10-16',
    expectedHours: 7, // 9:00 AM to 5:00 PM = 8 hours, minus 1 hour lunch = 7 hours
    expectedDayType: 'Full Day',
    expectedCalculation: {
      fullDayPay: 550,
      totalExpected: 550 // Full day rate (time-in before 9:30)
    }
  }
];

// Employee configuration
const employee = {
  dailyRate: 550,
  overtimeRate: 85.94
};

console.log('\n📋 Employee Configuration:');
console.log(`   Daily Rate: ₱${employee.dailyRate}`);
console.log(`   Hourly Rate: ₱${(employee.dailyRate / 8).toFixed(2)}`);
console.log(`   Half-Day Base: ₱${(employee.dailyRate / 2).toFixed(2)}`);
console.log(`   Overtime Rate: ₱${employee.overtimeRate}`);
console.log('\n' + '='.repeat(80));

// Run tests
let passedTests = 0;
let failedTests = 0;

testScenarios.forEach((scenario, index) => {
  console.log(`\n\n🧪 ${scenario.name}`);
  console.log('-'.repeat(80));
  
  const attendance = {
    timeIn: scenario.timeIn,
    timeOut: scenario.timeOut,
    date: scenario.date
  };
  
  const result = validateAndCalculateAttendance(attendance, employee);
  
  console.log('\n📊 Input:');
  console.log(`   Time In:  ${scenario.timeIn}`);
  console.log(`   Time Out: ${scenario.timeOut}`);
  console.log(`   Date:     ${scenario.date}`);
  
  console.log('\n📈 Calculated Results:');
  console.log(`   Day Type:         ${result.dayType}`);
  console.log(`   Time-In Status:   ${result.timeInStatus}`);
  console.log(`   Hours Worked:     ${result.hoursWorked} hours`);
  console.log(`   Overtime Hours:   ${result.overtimeHours} hours`);
  console.log(`   Day Salary:       ₱${parseFloat(result.daySalary).toFixed(2)}`);
  console.log(`   Overtime Pay:     ₱${parseFloat(result.overtimePay).toFixed(2)}`);
  console.log(`   Total Pay:        ₱${parseFloat(result.totalPay).toFixed(2)}`);
  console.log(`   Hourly Rate:      ₱${result.hourlyRate}`);
  
  console.log('\n✅ Expected Values:');
  console.log(`   Day Type:         ${scenario.expectedDayType}`);
  console.log(`   Hours Worked:     ~${scenario.expectedHours} hours`);
  
  if (scenario.expectedCalculation.halfDayBase !== undefined) {
    console.log(`   Half-Day Base:    ₱${scenario.expectedCalculation.halfDayBase.toFixed(2)}`);
    console.log(`   Extra Hours:      ${scenario.expectedCalculation.extraHours} hours`);
    console.log(`   Hourly Rate:      ₱${scenario.expectedCalculation.hourlyRate.toFixed(2)}`);
    console.log(`   Additional Pay:   ₱${scenario.expectedCalculation.additionalPay.toFixed(2)}`);
  }
  console.log(`   Total Expected:   ₱${scenario.expectedCalculation.totalExpected.toFixed(2)}`);
  
  // Validation
  const hoursWorkedFloat = parseFloat(result.hoursWorked);
  const daySalaryFloat = parseFloat(result.daySalary);
  const totalPayFloat = parseFloat(result.totalPay);
  
  const dayTypeMatches = result.dayType === scenario.expectedDayType;
  const hoursClose = Math.abs(hoursWorkedFloat - scenario.expectedHours) < 0.5; // Allow 30-minute tolerance
  const salaryClose = Math.abs(totalPayFloat - scenario.expectedCalculation.totalExpected) < 1; // Allow ₱1 tolerance
  
  console.log('\n🔍 Test Results:');
  console.log(`   Day Type Match:   ${dayTypeMatches ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Hours Match:      ${hoursClose ? '✅ PASS' : '❌ FAIL'} (Actual: ${hoursWorkedFloat}, Expected: ~${scenario.expectedHours})`);
  console.log(`   Salary Match:     ${salaryClose ? '✅ PASS' : '❌ FAIL'} (Actual: ₱${totalPayFloat.toFixed(2)}, Expected: ₱${scenario.expectedCalculation.totalExpected.toFixed(2)})`);
  
  if (dayTypeMatches && hoursClose && salaryClose) {
    console.log('\n✅ TEST PASSED');
    passedTests++;
  } else {
    console.log('\n❌ TEST FAILED');
    failedTests++;
  }
  
  console.log('-'.repeat(80));
});

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests:   ${testScenarios.length}`);
console.log(`Passed:        ${passedTests} ✅`);
console.log(`Failed:        ${failedTests} ❌`);
console.log(`Success Rate:  ${((passedTests / testScenarios.length) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

// Exit with appropriate code
if (failedTests > 0) {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed! Hourly rate calculation is working correctly.');
  process.exit(0);
}
