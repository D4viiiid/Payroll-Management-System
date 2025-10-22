/**
 * Attendance Calculator Utility
 * Handles time-in validation and day type calculations
 * Business Rules:
 * - Time-in 8:00-9:30 AM = Full Day
 * - Time-in 9:31 AM onwards = Half Day (if >= 4 hours worked)
 * - Less than 4 hours worked = Incomplete Day
 * - Lunch break: 12:00 PM - 1:00 PM (excluded from hours calculation)
 */

import moment from 'moment-timezone';

// Set timezone to Philippines
const TIMEZONE = 'Asia/Manila';

// Time constants
const FULL_DAY_CUTOFF = { hour: 9, minute: 30 }; // 9:30 AM
const WORK_DAY_START = { hour: 8, minute: 0 };   // 8:00 AM
const WORK_DAY_END = { hour: 17, minute: 0 };    // 5:00 PM (overtime starts after this)
const MAX_TIME_OUT = { hour: 20, minute: 0 };    // 8:00 PM (max time out, auto time-out)
const LUNCH_START = { hour: 12, minute: 0 };     // 12:00 PM
const LUNCH_END = { hour: 13, minute: 0 };       // 1:00 PM
const HALF_DAY_MINIMUM_HOURS = 4;                // Minimum 4 hours for half-day
const FULL_DAY_HOURS = 8;                        // Expected hours for full day
const OVERTIME_ELIGIBLE_HOURS = 6.5;             // ✅ FIX ISSUE #2: Minimum 6.5 hours to be eligible for overtime pay
const LATEST_TIME_IN = { hour: 17, minute: 0 };  // ✅ FIX ISSUE #2: Cannot time-in after 5:00 PM

/**
 * Parse time string to moment object
 * @param {String} timeString - Time in format "HH:mm" or "HH:mm:ss"
 * @param {String} dateString - Date in format "YYYY-MM-DD"
 * @returns {moment} Moment object in Philippines timezone
 */
const parseTime = (timeString, dateString) => {
  if (!timeString || !dateString) return null;
  
  const dateTimeString = `${dateString} ${timeString}`;
  return moment.tz(dateTimeString, 'YYYY-MM-DD HH:mm:ss', TIMEZONE);
};

/**
 * Calculate time difference in hours (excluding lunch break)
 * @param {moment} timeIn - Time-in moment object
 * @param {moment} timeOut - Time-out moment object
 * @returns {Number} Hours worked (excluding 1-hour lunch)
 */
const calculateHoursWorked = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;

  // Create lunch break times for the same day
  const lunchStart = timeIn.clone()
    .hour(LUNCH_START.hour)
    .minute(LUNCH_START.minute)
    .second(0);
  
  const lunchEnd = timeIn.clone()
    .hour(LUNCH_END.hour)
    .minute(LUNCH_END.minute)
    .second(0);

  // Calculate total time difference in hours
  const totalHours = timeOut.diff(timeIn, 'hours', true);

  // Check if lunch break falls within work hours
  const workedThroughLunch = timeIn.isBefore(lunchEnd) && timeOut.isAfter(lunchStart);

  // Subtract 1 hour for lunch if applicable
  const hoursWorked = workedThroughLunch ? totalHours - 1 : totalHours;

  return Math.max(0, hoursWorked); // Ensure non-negative
};

/**
 * Determine time-in status based on arrival time
 * @param {moment} timeIn - Time-in moment object
 * @returns {String} Status: 'On Time', 'Half Day', or 'Late'
 */
const determineTimeInStatus = (timeIn) => {
  if (!timeIn) return 'Absent';

  const cutoffTime = timeIn.clone()
    .hour(FULL_DAY_CUTOFF.hour)
    .minute(FULL_DAY_CUTOFF.minute)
    .second(0);

  if (timeIn.isSameOrBefore(cutoffTime)) {
    return 'On Time'; // Arrived by 9:30 AM
  } else {
    return 'Half Day'; // Arrived after 9:30 AM
  }
};

/**
 * Determine day type based on time-in and hours worked
 * ✅ UPDATED: Now based on ACTUAL HOURS WORKED, not just time-in status
 * - Invalid: < 4 hours (no pay)
 * - Half Day: 4 to <6.5 hours (variable pay)
 * - Full Day: 6.5 to 8 hours from standard shift (full day pay)
 * - Overtime: > 6.5 hours AND past 5PM time-out (full day + OT pay)
 * @param {moment} timeIn - Time-in moment object
 * @param {moment} timeOut - Time-out moment object
 * @returns {Object} { dayType, hoursWorked, timeInStatus, isValid }
 */
const determineDayType = (timeIn, timeOut) => {
  if (!timeIn) {
    return {
      dayType: 'Absent',
      hoursWorked: 0,
      timeInStatus: 'Absent',
      isValid: false,
      reason: 'No time-in recorded'
    };
  }

  if (!timeOut) {
    return {
      dayType: 'Incomplete',
      hoursWorked: 0,
      timeInStatus: 'Incomplete',
      isValid: false,
      reason: 'No time-out recorded'
    };
  }

  const timeInStatus = determineTimeInStatus(timeIn);
  const hoursWorked = calculateHoursWorked(timeIn, timeOut);
  const timeOutHour = timeOut.hour();
  const isAfter5PM = timeOutHour >= 17;

  // ✅ RULE 1: Less than 4 hours = Invalid (no pay)
  if (hoursWorked < HALF_DAY_MINIMUM_HOURS) {
    return {
      dayType: 'Invalid',
      hoursWorked: hoursWorked.toFixed(2),
      timeInStatus,
      isValid: false,
      reason: `Invalid attendance (${hoursWorked.toFixed(2)} hours, minimum ${HALF_DAY_MINIMUM_HOURS} required)`
    };
  }

  // ✅ RULE 2: 4 to <6.5 hours = Half Day (variable pay based on actual hours)
  if (hoursWorked >= HALF_DAY_MINIMUM_HOURS && hoursWorked < OVERTIME_ELIGIBLE_HOURS) {
    return {
      dayType: 'Half Day',
      hoursWorked: hoursWorked.toFixed(2),
      timeInStatus,
      isValid: true,
      reason: `Worked ${hoursWorked.toFixed(2)} hours (4-6.5 hrs range = Half Day with variable pay)`
    };
  }

  // ✅ RULE 3 & 4: >= 6.5 hours
  // If time-in was during grace period (8:00-9:30 AM) AND worked 6.5-8 hours = Full Day
  // If worked > 6.5 hours AND time-out after 5PM = Overtime
  if (hoursWorked >= OVERTIME_ELIGIBLE_HOURS) {
    // Check if they have overtime hours (> 8 hours excluding lunch)
    const overtimeHours = Math.max(0, hoursWorked - FULL_DAY_HOURS);
    
    // If they have overtime hours AND timed out after 5PM = Overtime status
    if (overtimeHours > 0 && isAfter5PM) {
      return {
        dayType: 'Overtime',
        hoursWorked: hoursWorked.toFixed(2),
        timeInStatus,
        isValid: true,
        reason: `Worked ${hoursWorked.toFixed(2)} hours with ${overtimeHours.toFixed(2)}hrs overtime (after 5PM)`
      };
    }
    
    // Otherwise, it's a Full Day (6.5-8 hours or overtime but before 5PM)
    return {
      dayType: 'Full Day',
      hoursWorked: hoursWorked.toFixed(2),
      timeInStatus,
      isValid: true,
      reason: `Worked ${hoursWorked.toFixed(2)} hours (≥6.5 hrs = Full Day)`
    };
  }

  // Fallback (shouldn't reach here)
  return {
    dayType: 'Half Day',
    hoursWorked: hoursWorked.toFixed(2),
    timeInStatus,
    isValid: true,
    reason: 'Default to Half Day'
  };
};

/**
 * Calculate salary for a day based on day type and hours worked
 * ✅ UPDATED LOGIC:
 * - Invalid: No pay
 * - Half Day (4-<6.5 hrs): Half-day base + hourly rate for extra hours
 * - Full Day (6.5-8 hrs): Full day rate
 * - Overtime (>6.5 hrs + past 5PM): Full day rate (OT pay calculated separately)
 * @param {String} dayType - 'Invalid', 'Half Day', 'Full Day', or 'Overtime'
 * @param {Number} dailyRate - Employee's daily salary rate
 * @param {Number} hoursWorked - Actual hours worked (excluding lunch)
 * @returns {Number} Salary amount for the day
 */
const calculateDaySalary = (dayType, dailyRate, hoursWorked = 0) => {
  const hourlyRate = dailyRate / 8; // ₱550 / 8 = ₱68.75 per hour
  const halfDayBase = dailyRate * 0.5; // ₱275
  
  switch (dayType) {
    case 'Overtime':    // ✅ Overtime gets full day rate (OT pay added separately)
    case 'Full Day':
      return dailyRate;
    case 'Half Day':
      // Variable pay based on actual hours worked (4 to <6.5 hours)
      if (hoursWorked >= HALF_DAY_MINIMUM_HOURS && hoursWorked < OVERTIME_ELIGIBLE_HOURS) {
        // Half-day base + hourly rate for additional hours beyond 4
        const extraHours = hoursWorked - HALF_DAY_MINIMUM_HOURS;
        const additionalPay = extraHours * hourlyRate;
        return halfDayBase + additionalPay;
      }
      // Standard half-day (exactly 4 hours)
      return halfDayBase;
    case 'Invalid':     // ✅ Invalid status = no pay
    case 'Incomplete':
    case 'Absent':
    default:
      return 0;
  }
};

/**
 * Calculate overtime hours (hours beyond 8 hours, excluding lunch)
 * @param {moment} timeIn - Time-in moment object
 * @param {moment} timeOut - Time-out moment object
 * @returns {Number} Overtime hours
 */
const calculateOvertimeHours = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;

  const hoursWorked = calculateHoursWorked(timeIn, timeOut);
  const overtimeHours = Math.max(0, hoursWorked - FULL_DAY_HOURS);

  return overtimeHours;
};

/**
 * Validate attendance record and calculate all fields
 * @param {Object} attendance - Attendance record with timeIn, timeOut, date
 * @param {Object} employee - Employee record with dailyRate, overtimeRate
 * @returns {Object} Complete attendance calculation
 */
const validateAndCalculateAttendance = (attendance, employee) => {
  const { timeIn, timeOut, date, notes } = attendance;
  const { dailyRate = 550, overtimeRate = 85.94 } = employee;

  // Parse times
  const timeInMoment = parseTime(timeIn, date);
  const timeOutMoment = parseTime(timeOut, date);

  // Determine day type and status
  const dayTypeResult = determineDayType(timeInMoment, timeOutMoment);

  // Calculate overtime
  const overtimeHours = calculateOvertimeHours(timeInMoment, timeOutMoment);
  
  // ✅ FIX ISSUE #2: Strict Overtime Eligibility Rules
  // Overtime pay ONLY applies when ALL 4 conditions are met:
  // 1. Worked > 8 hours total (excluding lunch)
  // 2. Worked ≥ 6.5 hours (minimum overtime eligibility threshold)
  // 3. Timed out after 5:00 PM
  // 4. Employee manually timed out (NOT auto-closed)
  // 
  // If ANY condition fails → use REGULAR hourly rate (₱71.25/hr), NOT overtime rate (₱89.06/hr)
  
  const wasAutoClosed = notes && (
    notes.includes('[Auto-closed after') || 
    notes.includes('[Auto-closed at end of day]') ||
    notes.includes('[Auto-closed at 8 PM') ||
    notes.includes('Auto-closed')
  );
  
  const timeOutHour = timeOutMoment ? timeOutMoment.hour() : 0;
  const isAfter5PM = timeOutHour >= 17; // 5:00 PM or later
  const hoursWorkedNum = parseFloat(dayTypeResult.hoursWorked) || 0;
  
  let overtimePay = 0;
  let overtimeNote = null;
  
  // Check ALL 4 conditions for overtime eligibility
  const condition1_moreThan8Hours = overtimeHours > 0; // > 8 hours total
  const condition2_atLeast6_5Hours = hoursWorkedNum >= OVERTIME_ELIGIBLE_HOURS; // ≥ 6.5 hours
  const condition3_after5PM = isAfter5PM; // Timed out after 5 PM
  const condition4_manualTimeout = !wasAutoClosed; // Not auto-closed
  
  const isOTEligible = condition1_moreThan8Hours && 
                       condition2_atLeast6_5Hours && 
                       condition3_after5PM && 
                       condition4_manualTimeout;
  
  if (isOTEligible) {
    // ✅ ELIGIBLE: All 4 conditions met → Apply OT rate (₱89.0625/hr)
    overtimePay = overtimeHours * overtimeRate;
    overtimeNote = `✅ OT ELIGIBLE: Worked ${hoursWorkedNum}hrs (>${FULL_DAY_HOURS}hrs), timed out at ${timeOutMoment.format('h:mm A')} (after 5PM), manual timeout. OT Pay: ${overtimeHours.toFixed(2)}hrs × ₱${overtimeRate} = ₱${overtimePay.toFixed(2)}`;
  } else {
    // ❌ NOT ELIGIBLE: At least one condition failed → Regular hourly rate for extra hours
    overtimePay = 0;
    
    // Build detailed explanation of why not eligible
    const reasons = [];
    if (!condition1_moreThan8Hours) reasons.push(`only ${hoursWorkedNum}hrs worked (need >8hrs)`);
    if (!condition2_atLeast6_5Hours) reasons.push(`only ${hoursWorkedNum}hrs worked (need ≥6.5hrs)`);
    if (!condition3_after5PM) reasons.push(`timed out before 5PM`);
    if (!condition4_manualTimeout) reasons.push(`auto-closed timeout`);
    
    overtimeNote = `❌ NOT OT ELIGIBLE: ${reasons.join(', ')}. ${
      hoursWorkedNum > HALF_DAY_MINIMUM_HOURS 
        ? `Variable pay at regular hourly rate (₱${(dailyRate / 8).toFixed(2)}/hr).`
        : 'Insufficient hours for pay.'
    }`;
  }

  // Calculate day salary (now includes hourly rate logic for partial days)
  const daySalary = calculateDaySalary(dayTypeResult.dayType, dailyRate, hoursWorkedNum);

  return {
    ...dayTypeResult,
    overtimeHours: overtimeHours.toFixed(2),
    overtimePay: overtimePay.toFixed(2),
    daySalary: daySalary.toFixed(2),
    totalPay: (parseFloat(daySalary) + parseFloat(overtimePay)).toFixed(2),
    dailyRate,
    overtimeRate,
    hourlyRate: (dailyRate / 8).toFixed(2),
    calculatedAt: new Date(),
    overtimeNote,
    wasAutoClosed // Track if this was an auto-closed shift
  };
};

/**
 * Calculate attendance summary for a pay period
 * @param {Array} attendanceRecords - Array of attendance records
 * @param {Object} employee - Employee record
 * @returns {Object} Summary with totals
 */
const calculateAttendanceSummary = (attendanceRecords, employee) => {
  let totalFullDays = 0;
  let totalHalfDays = 0;
  let totalOvertimeDays = 0;   // ✅ NEW: Count overtime days
  let totalIncompleteDays = 0;
  let totalInvalidDays = 0;    // ✅ FIX ISSUE #2: Count invalid days
  let totalAbsentDays = 0;
  let totalHoursWorked = 0;
  let totalOvertimeHours = 0;
  let totalBasicSalary = 0;
  let totalOvertimePay = 0;

  const processedRecords = attendanceRecords.map(record => {
    const calculated = validateAndCalculateAttendance(record, employee);

    // Count day types
    switch (calculated.dayType) {
      case 'Full Day':
        totalFullDays++;
        break;
      case 'Half Day':
        totalHalfDays++;
        break;
      case 'Overtime':       // ✅ NEW: Count overtime days
        totalOvertimeDays++;
        break;
      case 'Invalid':        // ✅ FIX ISSUE #2: Count invalid days
        totalInvalidDays++;
        break;
      case 'Incomplete':
        totalIncompleteDays++;
        break;
      case 'Absent':
        totalAbsentDays++;
        break;
    }

    // Accumulate totals
    totalHoursWorked += parseFloat(calculated.hoursWorked) || 0;
    totalOvertimeHours += parseFloat(calculated.overtimeHours) || 0;
    totalBasicSalary += parseFloat(calculated.daySalary) || 0;
    totalOvertimePay += parseFloat(calculated.overtimePay) || 0;

    return {
      ...record,
      ...calculated
    };
  });

  return {
    processedRecords,
    summary: {
      totalDays: attendanceRecords.length,
      fullDays: totalFullDays,
      halfDays: totalHalfDays,
      overtimeDays: totalOvertimeDays,    // ✅ NEW: Include overtime days count
      incompleteDays: totalIncompleteDays,
      invalidDays: totalInvalidDays,      // ✅ FIX ISSUE #2: Include invalid days in summary
      absentDays: totalAbsentDays,
      totalHoursWorked: totalHoursWorked.toFixed(2),
      totalOvertimeHours: totalOvertimeHours.toFixed(2),
      totalBasicSalary: totalBasicSalary.toFixed(2),
      totalOvertimePay: totalOvertimePay.toFixed(2),
      totalPay: (totalBasicSalary + totalOvertimePay).toFixed(2)
    }
  };
};

/**
 * Validate time-in in real-time (for biometric scanner)
 * @param {String} timeIn - Current time-in time "HH:mm:ss"
 * @param {String} date - Current date "YYYY-MM-DD"
 * @returns {Object} Validation result with warning/status
 */
const validateTimeInRealTime = (timeIn, date) => {
  const timeInMoment = parseTime(timeIn, date);
  
  if (!timeInMoment) {
    return {
      isValid: false,
      status: 'Error',
      message: 'Invalid time format',
      dayType: 'Incomplete'
    };
  }

  // ✅ FIX ISSUE #2: Cannot time-in after 5:00 PM
  const latestTimeIn = timeInMoment.clone()
    .hour(LATEST_TIME_IN.hour)
    .minute(LATEST_TIME_IN.minute)
    .second(0);
  
  if (timeInMoment.isAfter(latestTimeIn)) {
    return {
      isValid: false,
      status: 'Error',
      message: '❌ Time-in not allowed after 5:00 PM. Please contact your supervisor.',
      dayType: 'Invalid',
      expectedPay: 'No pay'
    };
  }

  const timeInStatus = determineTimeInStatus(timeInMoment);
  
  if (timeInStatus === 'On Time') {
    return {
      isValid: true,
      status: 'On Time',
      message: 'Good morning! Time-in recorded successfully.',
      dayType: 'Full Day',
      expectedPay: 'Full day salary'
    };
  } else {
    return {
      isValid: true,
      status: 'Half Day',
      message: 'Warning: You arrived after 9:30 AM. This will be recorded as HALF DAY. You must work at least 4 hours to receive half-day pay.',
      dayType: 'Half Day (Conditional)',
      expectedPay: 'Half day salary (if 4+ hours worked)'
    };
  }
};

export {
  parseTime,
  calculateHoursWorked,
  determineTimeInStatus,
  determineDayType,
  calculateDaySalary,
  calculateOvertimeHours,
  validateAndCalculateAttendance,
  calculateAttendanceSummary,
  validateTimeInRealTime
};

export const CONSTANTS = {
  FULL_DAY_CUTOFF,
  HALF_DAY_MINIMUM_HOURS,
  FULL_DAY_HOURS,
  OVERTIME_ELIGIBLE_HOURS,  // ✅ FIX ISSUE #2: Export new constant
  LATEST_TIME_IN,           // ✅ FIX ISSUE #2: Export new constant
  MAX_TIME_OUT,             // ✅ FIX ISSUE #2: Export new constant
  LUNCH_START,
  LUNCH_END,
  TIMEZONE
};

