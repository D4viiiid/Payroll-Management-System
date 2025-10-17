/**
 * Test Suite for Enhanced Attendance Calculator (Phase 2)
 * Tests time-in validation rules and day type calculations
 */

import {
  validateAndCalculateAttendance,
  calculateAttendanceSummary,
  validateTimeInRealTime,
  CONSTANTS
} from './utils/attendanceCalculator.js';

console.log('\n🧪 TESTING PHASE 2 ATTENDANCE CALCULATOR\n');
console.log('=' .repeat(60));

const employee = {
  dailyRate: 550,
  overtimeRate: 85.94
};

// Test 1: On Time (8:00 AM - 9:30 AM) = Full Day
console.log('\n✅ TEST 1: On Time Arrival (8:30 AM)');
const test1 = validateAndCalculateAttendance(
  {
    timeIn: '08:30:00',
    timeOut: '17:00:00',
    date: '2025-10-14'
  },
  employee
);
console.log('Time In: 8:30 AM');
console.log('Time Out: 5:00 PM');
console.log('Result:', test1.dayType);
console.log('Status:', test1.timeInStatus);
console.log('Hours Worked:', test1.hoursWorked, 'hours');
console.log('Day Salary: ₱' + test1.daySalary);
console.log('Reason:', test1.reason);
console.log('Expected: Full Day, ₱550');
console.log('✅ PASS:', test1.dayType === 'Full Day' && test1.daySalary === '550.00' ? 'YES' : 'NO');

// Test 2: Late (after 9:30 AM) = Half Day
console.log('\n✅ TEST 2: Late Arrival (10:00 AM) with 4+ hours');
const test2 = validateAndCalculateAttendance(
  {
    timeIn: '10:00:00',
    timeOut: '17:00:00',
    date: '2025-10-14'
  },
  employee
);
console.log('Time In: 10:00 AM');
console.log('Time Out: 5:00 PM');
console.log('Result:', test2.dayType);
console.log('Status:', test2.timeInStatus);
console.log('Hours Worked:', test2.hoursWorked, 'hours');
console.log('Day Salary: ₱' + test2.daySalary);
console.log('Reason:', test2.reason);
console.log('Expected: Half Day, ₱275');
console.log('✅ PASS:', test2.dayType === 'Half Day' && test2.daySalary === '275.00' ? 'YES' : 'NO');

// Test 3: Late with insufficient hours (< 4 hours) = Incomplete
console.log('\n✅ TEST 3: Late Arrival with < 4 hours worked');
const test3 = validateAndCalculateAttendance(
  {
    timeIn: '14:00:00',
    timeOut: '17:00:00',
    date: '2025-10-14'
  },
  employee
);
console.log('Time In: 2:00 PM');
console.log('Time Out: 5:00 PM');
console.log('Result:', test3.dayType);
console.log('Status:', test3.timeInStatus);
console.log('Hours Worked:', test3.hoursWorked, 'hours');
console.log('Day Salary: ₱' + test3.daySalary);
console.log('Reason:', test3.reason);
console.log('Expected: Incomplete, ₱0');
console.log('✅ PASS:', test3.dayType === 'Incomplete' && test3.daySalary === '0.00' ? 'YES' : 'NO');

// Test 4: Overtime calculation (> 8 hours)
console.log('\n✅ TEST 4: Overtime Work (8:00 AM - 7:00 PM)');
const test4 = validateAndCalculateAttendance(
  {
    timeIn: '08:00:00',
    timeOut: '19:00:00',
    date: '2025-10-14'
  },
  employee
);
console.log('Time In: 8:00 AM');
console.log('Time Out: 7:00 PM');
console.log('Result:', test4.dayType);
console.log('Hours Worked:', test4.hoursWorked, 'hours');
console.log('Overtime Hours:', test4.overtimeHours, 'hours');
console.log('Day Salary: ₱' + test4.daySalary);
console.log('Overtime Pay: ₱' + test4.overtimePay);
console.log('Total Pay: ₱' + test4.totalPay);
console.log('Expected: 10 hours worked, 2 hours OT, ₱721.88 total');
console.log('✅ PASS:', parseFloat(test4.overtimeHours) === 2 ? 'YES' : 'NO');

// Test 5: No time-out = Incomplete
console.log('\n✅ TEST 5: Missing Time-Out');
const test5 = validateAndCalculateAttendance(
  {
    timeIn: '08:00:00',
    timeOut: null,
    date: '2025-10-14'
  },
  employee
);
console.log('Time In: 8:00 AM');
console.log('Time Out: (none)');
console.log('Result:', test5.dayType);
console.log('Reason:', test5.reason);
console.log('Expected: Incomplete');
console.log('✅ PASS:', test5.dayType === 'Incomplete' ? 'YES' : 'NO');

// Test 6: No time-in = Absent
console.log('\n✅ TEST 6: Missing Time-In (Absent)');
const test6 = validateAndCalculateAttendance(
  {
    timeIn: null,
    timeOut: null,
    date: '2025-10-14'
  },
  employee
);
console.log('Time In: (none)');
console.log('Time Out: (none)');
console.log('Result:', test6.dayType);
console.log('Reason:', test6.reason);
console.log('Expected: Absent');
console.log('✅ PASS:', test6.dayType === 'Absent' ? 'YES' : 'NO');

// Test 7: Weekly Summary Calculation
console.log('\n✅ TEST 7: Weekly Attendance Summary');
const weekAttendance = [
  { timeIn: '08:00:00', timeOut: '17:00:00', date: '2025-10-14' }, // Full
  { timeIn: '08:30:00', timeOut: '17:00:00', date: '2025-10-15' }, // Full
  { timeIn: '10:00:00', timeOut: '17:00:00', date: '2025-10-16' }, // Half
  { timeIn: '08:00:00', timeOut: '18:00:00', date: '2025-10-17' }, // Full + OT
  { timeIn: '14:00:00', timeOut: '17:00:00', date: '2025-10-18' }, // Incomplete
];

const summary = calculateAttendanceSummary(weekAttendance, employee);
console.log('Weekly Summary:');
console.log('  Total Days:', summary.summary.totalDays);
console.log('  Full Days:', summary.summary.fullDays);
console.log('  Half Days:', summary.summary.halfDays);
console.log('  Incomplete Days:', summary.summary.incompleteDays);
console.log('  Total Hours:', summary.summary.totalHoursWorked, 'hours');
console.log('  Overtime Hours:', summary.summary.totalOvertimeHours, 'hours');
console.log('  Basic Salary: ₱' + summary.summary.totalBasicSalary);
console.log('  Overtime Pay: ₱' + summary.summary.totalOvertimePay);
console.log('  Total Pay: ₱' + summary.summary.totalPay);
console.log('Expected: 3 full, 1 half, 1 incomplete');
console.log('✅ PASS:', 
  summary.summary.fullDays === 3 && 
  summary.summary.halfDays === 1 && 
  summary.summary.incompleteDays === 1 ? 'YES' : 'NO'
);

// Test 8: Real-time validation (for biometric scanner)
console.log('\n✅ TEST 8: Real-Time Time-In Validation');
const rtValidation1 = validateTimeInRealTime('08:15:00', '2025-10-14');
console.log('Time-in at 8:15 AM:');
console.log('  Status:', rtValidation1.status);
console.log('  Message:', rtValidation1.message);

const rtValidation2 = validateTimeInRealTime('10:30:00', '2025-10-14');
console.log('\nTime-in at 10:30 AM:');
console.log('  Status:', rtValidation2.status);
console.log('  Message:', rtValidation2.message);

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS COMPLETED');
console.log('='.repeat(60) + '\n');
