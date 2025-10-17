/**
 * Attendance Fraud Prevention Middleware
 * Validates attendance records to prevent manipulation and fraud
 */

import Attendance from '../models/AttendanceModels.js';
import { getPhilippinesNow, getStartOfDay, getEndOfDay, shouldAutoCloseShift } from '../utils/dateHelpers.js';

/**
 * Validation rules for attendance fraud prevention
 */
const FRAUD_RULES = {
  MAX_SHIFT_HOURS: 12,
  MAX_OVERTIME_HOURS: 4,
  MIN_BREAK_TIME_HOURS: 0.5, // Minimum 30 minutes between shifts
  MAX_SHIFTS_PER_DAY: 1,
  SUSPICIOUS_PATTERN_THRESHOLD: 3, // Number of suspicious events before flagging
};

/**
 * Check for multiple open shifts for same employee
 * @param {String} employeeId - Employee ID to check
 * @returns {Object} Validation result
 */
export const validateNoMultipleOpenShifts = async (employeeId) => {
  try {
    const openShifts = await Attendance.find({
      employeeId,
      timeIn: { $exists: true, $ne: null },
      timeOut: null,
      archived: false
    });

    if (openShifts.length > 1) {
      return {
        valid: false,
        error: 'MULTIPLE_OPEN_SHIFTS',
        message: `Employee ${employeeId} has ${openShifts.length} open shifts. This may indicate fraud.`,
        shifts: openShifts.map(s => ({
          date: s.date,
          timeIn: s.timeIn,
          _id: s._id
        }))
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('❌ Error validating open shifts:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: error.message
    };
  }
};

/**
 * Check for excessive hours that may indicate fraud
 * @param {Date} timeIn - Time in timestamp
 * @param {Date} timeOut - Time out timestamp  
 * @returns {Object} Validation result
 */
export const validateShiftDuration = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) {
    return { valid: true }; // Can't validate incomplete shift
  }

  const durationHours = (timeOut - timeIn) / (1000 * 60 * 60);

  if (durationHours > FRAUD_RULES.MAX_SHIFT_HOURS) {
    return {
      valid: false,
      error: 'EXCESSIVE_HOURS',
      message: `Shift duration of ${durationHours.toFixed(2)} hours exceeds maximum of ${FRAUD_RULES.MAX_SHIFT_HOURS} hours.`,
      duration: durationHours
    };
  }

  if (durationHours < 0) {
    return {
      valid: false,
      error: 'INVALID_TIME_ORDER',
      message: 'Time out cannot be before time in.',
      duration: durationHours
    };
  }

  return { valid: true, duration: durationHours };
};

/**
 * Check for multiple shifts on same day
 * @param {String} employeeId - Employee ID
 * @param {Date} date - Date to check
 * @returns {Object} Validation result
 */
export const validateMaxShiftsPerDay = async (employeeId, date) => {
  try {
    const startOfDay = getStartOfDay(date);
    const endOfDay = getEndOfDay(date);

    const existingShifts = await Attendance.find({
      employeeId,
      date: { $gte: startOfDay, $lte: endOfDay },
      archived: false
    });

    if (existingShifts.length >= FRAUD_RULES.MAX_SHIFTS_PER_DAY) {
      return {
        valid: false,
        error: 'MAX_SHIFTS_EXCEEDED',
        message: `Employee ${employeeId} already has ${existingShifts.length} shift(s) for this day.`,
        existingShifts: existingShifts.length
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('❌ Error validating shifts per day:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: error.message
    };
  }
};

/**
 * Check for minimum break time between shifts
 * @param {String} employeeId - Employee ID
 * @param {Date} newTimeIn - New time in timestamp
 * @returns {Object} Validation result
 */
export const validateBreakTime = async (employeeId, newTimeIn) => {
  try {
    // Find the most recent shift with time out
    const lastShift = await Attendance.findOne({
      employeeId,
      timeOut: { $exists: true, $ne: null },
      archived: false
    }).sort({ timeOut: -1 });

    if (lastShift && lastShift.timeOut) {
      const breakTimeHours = (newTimeIn - lastShift.timeOut) / (1000 * 60 * 60);

      if (breakTimeHours < FRAUD_RULES.MIN_BREAK_TIME_HOURS) {
        return {
          valid: false,
          error: 'INSUFFICIENT_BREAK_TIME',
          message: `Only ${breakTimeHours.toFixed(2)} hours since last time out. Minimum ${FRAUD_RULES.MIN_BREAK_TIME_HOURS} hours break required.`,
          breakTime: breakTimeHours
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('❌ Error validating break time:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: error.message
    };
  }
};

/**
 * Check for suspicious overtime patterns
 * @param {String} employeeId - Employee ID
 * @returns {Object} Validation result
 */
export const validateOvertimePattern = async (employeeId) => {
  try {
    // Check last 7 days for excessive overtime
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRecords = await Attendance.find({
      employeeId,
      date: { $gte: sevenDaysAgo },
      overtimeHours: { $gt: 0 },
      archived: false
    });

    const totalOvertime = recentRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const avgOvertimePerDay = totalOvertime / 7;

    if (avgOvertimePerDay > FRAUD_RULES.MAX_OVERTIME_HOURS / 2) {
      return {
        valid: false,
        warning: true, // This is a warning, not a hard block
        error: 'EXCESSIVE_OVERTIME_PATTERN',
        message: `Employee ${employeeId} averaging ${avgOvertimePerDay.toFixed(2)} overtime hours per day over last 7 days.`,
        totalOvertime,
        avgPerDay: avgOvertimePerDay
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('❌ Error validating overtime pattern:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: error.message
    };
  }
};

/**
 * Master validation function - runs all fraud checks
 * @param {Object} params - Validation parameters
 * @returns {Object} Comprehensive validation result
 */
export const validateAttendanceForFraud = async ({
  employeeId,
  timeIn,
  timeOut = null,
  date,
  action = 'time_in' // 'time_in' or 'time_out'
}) => {
  const validations = {
    passed: true,
    warnings: [],
    errors: [],
    checks: {}
  };

  try {
    // Check 1: No multiple open shifts
    const openShiftsCheck = await validateNoMultipleOpenShifts(employeeId);
    validations.checks.multipleOpenShifts = openShiftsCheck;
    if (!openShiftsCheck.valid) {
      validations.passed = false;
      validations.errors.push(openShiftsCheck);
    }

    // Check 2: Max shifts per day
    const maxShiftsCheck = await validateMaxShiftsPerDay(employeeId, date);
    validations.checks.maxShiftsPerDay = maxShiftsCheck;
    if (!maxShiftsCheck.valid) {
      validations.passed = false;
      validations.errors.push(maxShiftsCheck);
    }

    // Check 3: Break time between shifts
    if (action === 'time_in') {
      const breakTimeCheck = await validateBreakTime(employeeId, timeIn);
      validations.checks.breakTime = breakTimeCheck;
      if (!breakTimeCheck.valid) {
        validations.passed = false;
        validations.errors.push(breakTimeCheck);
      }
    }

    // Check 4: Shift duration (only if timing out)
    if (action === 'time_out' && timeOut) {
      const durationCheck = validateShiftDuration(timeIn, timeOut);
      validations.checks.shiftDuration = durationCheck;
      if (!durationCheck.valid) {
        validations.passed = false;
        validations.errors.push(durationCheck);
      }
    }

    // Check 5: Overtime patterns (warning only)
    const overtimeCheck = await validateOvertimePattern(employeeId);
    validations.checks.overtimePattern = overtimeCheck;
    if (!overtimeCheck.valid && overtimeCheck.warning) {
      validations.warnings.push(overtimeCheck);
    }

    // Auto-close check (informational)
    if (action === 'time_in' && timeIn) {
      const shouldAutoClose = shouldAutoCloseShift(timeIn);
      validations.checks.autoCloseEligible = {
        eligible: shouldAutoClose,
        message: shouldAutoClose ? 'This shift is eligible for auto-close' : 'Not eligible for auto-close yet'
      };
    }

  } catch (error) {
    console.error('❌ Error in fraud validation:', error);
    validations.passed = false;
    validations.errors.push({
      error: 'VALIDATION_ERROR',
      message: error.message
    });
  }

  return validations;
};

/**
 * Middleware to validate attendance before recording
 */
export const validateAttendanceMiddleware = async (req, res, next) => {
  try {
    const { employeeId, timeIn, timeOut, date, action } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_EMPLOYEE_ID',
        message: 'Employee ID is required'
      });
    }

    // Run fraud validation
    const validation = await validateAttendanceForFraud({
      employeeId,
      timeIn: timeIn ? new Date(timeIn) : getPhilippinesNow(),
      timeOut: timeOut ? new Date(timeOut) : null,
      date: date ? new Date(date) : getStartOfDay(),
      action: action || 'time_in'
    });

    // Attach validation results to request
    req.attendanceValidation = validation;

    // If validation failed, return error
    if (!validation.passed) {
      return res.status(400).json({
        success: false,
        error: 'FRAUD_VALIDATION_FAILED',
        message: 'Attendance record failed fraud validation',
        validations: validation
      });
    }

    // If there are warnings, log them but allow request to continue
    if (validation.warnings.length > 0) {
      console.log(`⚠️  Attendance warnings for ${employeeId}:`, validation.warnings);
    }

    next();
  } catch (error) {
    console.error('❌ Error in validation middleware:', error);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message
    });
  }
};

export default {
  validateAttendanceForFraud,
  validateAttendanceMiddleware,
  validateNoMultipleOpenShifts,
  validateShiftDuration,
  validateMaxShiftsPerDay,
  validateBreakTime,
  validateOvertimePattern,
  FRAUD_RULES
};
