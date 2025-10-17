import cron from 'node-cron';
import Attendance from '../models/AttendanceModels.js';
import Employee from '../models/EmployeeModels.js';
import { 
  getPhilippinesNow, 
  getStartOfDay, 
  getEndOfDay, 
  shouldAutoCloseShift,
  calculateAutoCloseTime,
  MAX_SHIFT_HOURS,
  formatTime
} from '../utils/dateHelpers.js';
import { validateAndCalculateAttendance } from '../utils/attendanceCalculator.js';

/**
 * Auto-close open shifts that exceed maximum shift hours
 * Runs every hour to check for shifts that need to be closed
 */
export const scheduleAutoCloseShifts = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔄 [Auto-Close] Running scheduled shift auto-close task...');
      await autoCloseOpenShifts();
    } catch (error) {
      console.error('❌ [Auto-Close] Error in scheduled task:', error);
    }
  });

  console.log('✅ [Auto-Close] Scheduled task initialized - runs every hour');
};

/**
 * Auto-close open shifts that have exceeded MAX_SHIFT_HOURS
 * @returns {Object} Summary of auto-closed shifts
 */
export const autoCloseOpenShifts = async () => {
  try {
    const now = getPhilippinesNow();
    console.log(`🔍 [Auto-Close] Checking for open shifts at ${formatTime(now)}...`);

    // Find all attendance records with timeIn but no timeOut
    // Only check records from the last 2 days to avoid processing very old records
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const openShifts = await Attendance.find({
      timeIn: { $exists: true, $ne: null },
      timeOut: null,
      date: { $gte: twoDaysAgo },
      archived: false
    }).populate('employee');

    console.log(`📊 [Auto-Close] Found ${openShifts.length} open shifts to check`);

    let autoClosedCount = 0;
    const summary = {
      total: openShifts.length,
      closed: 0,
      skipped: 0,
      errors: [],
      details: []
    };

    for (const shift of openShifts) {
      try {
        // Check if shift should be auto-closed
        if (shouldAutoCloseShift(shift.timeIn)) {
          // Calculate auto-close time (timeIn + MAX_SHIFT_HOURS)
          const autoCloseTime = calculateAutoCloseTime(shift.timeIn);
          
          console.log(`⏰ [Auto-Close] Closing shift for ${shift.employeeId}: ${formatTime(shift.timeIn)} -> ${formatTime(autoCloseTime)}`);

          // Update the attendance record with auto-close time
          shift.timeOut = autoCloseTime;
          shift.notes = (shift.notes || '') + ` [Auto-closed after ${MAX_SHIFT_HOURS} hours]`;

          // Recalculate attendance with the new timeOut
          const employee = await Employee.findOne({ employeeId: shift.employeeId });
          if (employee) {
            const calculation = await validateAndCalculateAttendance(
              shift.timeIn,
              autoCloseTime,
              shift.date,
              employee.dailyRate || 550
            );

            // Update shift with calculated values
            shift.dayType = calculation.dayType;
            shift.actualHoursWorked = calculation.actualHoursWorked;
            shift.overtimeHours = calculation.overtimeHours;
            shift.daySalary = calculation.daySalary;
            shift.overtimePay = calculation.overtimePay;
            shift.totalPay = calculation.totalPay;
            shift.isValidDay = calculation.isValidDay;
            shift.validationReason = calculation.validationReason + ' (Auto-closed)';

            await shift.save();

            autoClosedCount++;
            summary.closed++;
            summary.details.push({
              employeeId: shift.employeeId,
              date: shift.date,
              timeIn: shift.timeIn,
              autoClosedAt: autoCloseTime,
              hoursWorked: calculation.actualHoursWorked,
              dayType: calculation.dayType
            });

            console.log(`✅ [Auto-Close] Shift closed for ${shift.employeeId}: ${calculation.dayType}, ${calculation.actualHoursWorked.toFixed(2)} hours`);
          } else {
            console.warn(`⚠️ [Auto-Close] Employee not found: ${shift.employeeId}`);
            summary.skipped++;
          }
        } else {
          // Shift hasn't exceeded max hours yet
          summary.skipped++;
        }
      } catch (error) {
        console.error(`❌ [Auto-Close] Error closing shift for ${shift.employeeId}:`, error);
        summary.errors.push({
          employeeId: shift.employeeId,
          error: error.message
        });
      }
    }

    console.log(`✅ [Auto-Close] Task completed: ${autoClosedCount} shifts auto-closed, ${summary.skipped} skipped`);

    return summary;
  } catch (error) {
    console.error('❌ [Auto-Close] Error in autoCloseOpenShifts:', error);
    throw error;
  }
};

/**
 * Check for employees who didn't time out yesterday and close their shifts
 * This should run once daily at midnight
 */
export const scheduleEndOfDayShiftClose = () => {
  // Run at 11:59 PM every day
  cron.schedule('59 23 * * *', async () => {
    try {
      console.log('🌙 [End-of-Day] Running end-of-day shift close...');
      await closeYesterdayOpenShifts();
    } catch (error) {
      console.error('❌ [End-of-Day] Error in scheduled task:', error);
    }
  });

  console.log('✅ [End-of-Day] Scheduled task initialized - runs at 11:59 PM daily');
};

/**
 * Close all open shifts from yesterday at end of day
 */
const closeYesterdayOpenShifts = async () => {
  try {
    const now = getPhilippinesNow();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayStart = getStartOfDay(yesterday);
    const yesterdayEnd = getEndOfDay(yesterday);

    console.log(`🔍 [End-of-Day] Checking for yesterday's open shifts...`);

    const openShifts = await Attendance.find({
      date: { $gte: yesterdayStart, $lte: yesterdayEnd },
      timeIn: { $exists: true, $ne: null },
      timeOut: null,
      archived: false
    });

    console.log(`📊 [End-of-Day] Found ${openShifts.length} open shifts from yesterday`);

    let closedCount = 0;

    for (const shift of openShifts) {
      try {
        // Close shift at 6:00 PM of the same day (standard end time)
        const standardEndTime = new Date(shift.date);
        standardEndTime.setHours(18, 0, 0, 0); // 6:00 PM

        shift.timeOut = standardEndTime;
        shift.notes = (shift.notes || '') + ' [Auto-closed at end of day]';

        // Recalculate attendance
        const employee = await Employee.findOne({ employeeId: shift.employeeId });
        if (employee) {
          const calculation = await validateAndCalculateAttendance(
            shift.timeIn,
            standardEndTime,
            shift.date,
            employee.dailyRate || 550
          );

          shift.dayType = calculation.dayType;
          shift.actualHoursWorked = calculation.actualHoursWorked;
          shift.overtimeHours = calculation.overtimeHours;
          shift.daySalary = calculation.daySalary;
          shift.overtimePay = calculation.overtimePay;
          shift.totalPay = calculation.totalPay;
          shift.isValidDay = calculation.isValidDay;
          shift.validationReason = calculation.validationReason + ' (End-of-day close)';

          await shift.save();
          closedCount++;

          console.log(`✅ [End-of-Day] Closed shift for ${shift.employeeId}`);
        }
      } catch (error) {
        console.error(`❌ [End-of-Day] Error closing shift for ${shift.employeeId}:`, error);
      }
    }

    console.log(`✅ [End-of-Day] Closed ${closedCount} shifts from yesterday`);
  } catch (error) {
    console.error('❌ [End-of-Day] Error in closeYesterdayOpenShifts:', error);
    throw error;
  }
};

/**
 * Manual trigger to run auto-close for testing
 * Can be called via API endpoint
 */
export const runManualAutoClose = async () => {
  console.log('🔧 [Manual] Running manual auto-close...');
  return await autoCloseOpenShifts();
};
