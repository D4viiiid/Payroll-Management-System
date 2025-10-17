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
const WORK_DAY_END = { hour: 17, minute: 0 };    // 5:00 PM
const LUNCH_START = { hour: 12, minute: 0 };     // 12:00 PM
const LUNCH_END = { hour: 13, minute: 0 };       // 1:00 PM
const HALF_DAY_MINIMUM_HOURS = 4;                // Minimum 4 hours for half-day
const FULL_DAY_HOURS = 8;                        // Expected hours for full day

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

  // If less than 4 hours worked, it's incomplete regardless of time-in
  if (hoursWorked < HALF_DAY_MINIMUM_HOURS) {
    return {
      dayType: 'Incomplete',
      hoursWorked: hoursWorked.toFixed(2),
      timeInStatus,
      isValid: false,
      reason: `Insufficient hours worked (${hoursWorked.toFixed(2)} hours, minimum ${HALF_DAY_MINIMUM_HOURS} required)`
    };
  }

  // If came in on time (by 9:30) and worked >= 4 hours
  if (timeInStatus === 'On Time') {
    // Full day if >= 8 hours, otherwise still full day credit if on time
    return {
      dayType: 'Full Day',
      hoursWorked: hoursWorked.toFixed(2),
      timeInStatus: 'On Time',
      isValid: true,
      reason: 'Arrived on time (by 9:30 AM)'
    };
  }

  // If came in late (after 9:30) but worked >= 4 hours
  return {
    dayType: 'Half Day',
    hoursWorked: hoursWorked.toFixed(2),
    timeInStatus: 'Half Day',
    isValid: true,
    reason: 'Arrived after 9:30 AM but worked minimum 4 hours'
  };
};

/**
 * Calculate salary for a day based on day type and hours worked
 * NEW LOGIC: If Half Day with 4-8 hours worked, pay half-day + hourly rate for extra hours
 * @param {String} dayType - 'Full Day', 'Half Day', or 'Incomplete'
 * @param {Number} dailyRate - Employee's daily salary rate
 * @param {Number} hoursWorked - Actual hours worked (excluding lunch)
 * @returns {Number} Salary amount for the day
 */
const calculateDaySalary = (dayType, dailyRate, hoursWorked = 0) => {
  const hourlyRate = dailyRate / 8; // ₱550 / 8 = ₱68.75 per hour
  const halfDayBase = dailyRate * 0.5; // ₱275
  
  switch (dayType) {
    case 'Full Day':
      return dailyRate;
    case 'Half Day':
      // If worked more than 4 hours but less than 8 hours
      if (hoursWorked > HALF_DAY_MINIMUM_HOURS && hoursWorked < FULL_DAY_HOURS) {
        // Half-day base + hourly rate for additional hours beyond 4
        const extraHours = hoursWorked - HALF_DAY_MINIMUM_HOURS;
        const additionalPay = extraHours * hourlyRate;
        return halfDayBase + additionalPay;
      }
      // Standard half-day (exactly 4 hours or defaulting to half-day rate)
      return halfDayBase;
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
  
  // ✅ FIX ISSUE #2: Overtime Pay Cap Logic
  // Overtime pay ONLY applies when:
  // 1. Employee manually times out (NOT auto-closed)
  // 2. Timeout is after 5:00 PM
  // 3. NOT a Full Day employee (capped at ₱550)
  
  const wasAutoClosed = notes && (
    notes.includes('[Auto-closed after') || 
    notes.includes('[Auto-closed at end of day]')
  );
  
  const timeOutHour = timeOutMoment.hour();
  const isAfter5PM = timeOutHour >= 17; // 5:00 PM or later
  
  let overtimePay = 0;
  let overtimeNote = null;
  
  if (dayTypeResult.dayType === 'Full Day') {
    // Full Day employees get ₱550 max, no overtime pay
    overtimePay = 0;
    if (overtimeHours > 0) {
      if (wasAutoClosed) {
        overtimeNote = `Auto-closed after ${overtimeHours.toFixed(2)}hrs overtime. No extra pay for Full Day rate (₱${dailyRate} max)`;
      } else {
        overtimeNote = `Worked ${overtimeHours.toFixed(2)}hrs overtime but no extra pay for Full Day rate (₱${dailyRate} max)`;
      }
    }
  } else if (wasAutoClosed) {
    // Auto-closed shifts get NO overtime pay (system timeout at 12 hours)
    overtimePay = 0;
    if (overtimeHours > 0) {
      overtimeNote = `Auto-closed after ${overtimeHours.toFixed(2)}hrs. No overtime pay for automatic timeout`;
    }
  } else if (isAfter5PM && overtimeHours > 0) {
    // Manual timeout after 5 PM - eligible for overtime pay
    overtimePay = overtimeHours * overtimeRate;
    overtimeNote = `Manual timeout after 5 PM: ${overtimeHours.toFixed(2)}hrs × ₱${overtimeRate} = ₱${overtimePay.toFixed(2)}`;
  } else {
    // Manual timeout before 5 PM - no overtime pay
    overtimePay = 0;
    if (overtimeHours > 0) {
      overtimeNote = `Timeout before 5 PM (${timeOutMoment.format('h:mm A')}). No overtime pay`;
    }
  }

  // Calculate day salary (now includes hourly rate logic for partial days)
  const hoursWorkedNum = parseFloat(dayTypeResult.hoursWorked) || 0;
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
  let totalIncompleteDays = 0;
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
      incompleteDays: totalIncompleteDays,
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
  LUNCH_START,
  LUNCH_END,
  TIMEZONE
};

