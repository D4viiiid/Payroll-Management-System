/**
 * Archive Service
 * Handles archiving and restoration of old records
 */

import moment from 'moment-timezone';
import Payroll from '../models/Payroll.model.js';
import Attendance from '../models/AttendanceModels.js';
import Deduction from '../models/Deduction.model.js';
import mongoose from 'mongoose';

const TIMEZONE = 'Asia/Manila';

// Define Archive Schemas
const ArchivedPayrollSchema = new mongoose.Schema({
  originalId: mongoose.Schema.Types.ObjectId,
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  weekEnding: {
    type: Date,
    required: true
  },
  workDays: Number,
  halfDays: Number,
  totalHoursWorked: Number,
  overtimeHours: Number,
  grossSalary: Number,
  totalDeductions: Number,
  netSalary: Number,
  deductions: [{
    name: String,
    amount: Number
  }],
  archivedAt: {
    type: Date,
    default: Date.now
  },
  archivedBy: String,
  originalCreatedAt: Date
}, { collection: 'archived_payrolls' });

const ArchivedAttendanceSchema = new mongoose.Schema({
  originalId: mongoose.Schema.Types.ObjectId,
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeIn: Date,
  timeOut: Date,
  status: String,
  actualHoursWorked: Number,
  overtimeHours: Number,
  dayType: String,
  timeInStatus: String,
  archivedAt: {
    type: Date,
    default: Date.now
  },
  archivedBy: String,
  originalCreatedAt: Date
}, { collection: 'archived_attendances' });

// Create models
const ArchivedPayroll = mongoose.model('ArchivedPayroll', ArchivedPayrollSchema);
const ArchivedAttendance = mongoose.model('ArchivedAttendance', ArchivedAttendanceSchema);

/**
 * Archive payroll records older than specified date
 * @param {Date} beforeDate - Archive records before this date
 * @param {String} archivedBy - User who initiated archive
 * @returns {Object} Archive result
 */
export const archivePayrollRecords = async (beforeDate, archivedBy = 'System') => {
  try {
    // Find payroll records to archive
    const payrollsToArchive = await Payroll.find({
      weekEnding: { $lt: beforeDate }
    });

    if (payrollsToArchive.length === 0) {
      return {
        success: true,
        message: 'No payroll records to archive',
        archivedCount: 0
      };
    }

    // Create archived copies
    const archivedPayrolls = payrollsToArchive.map(payroll => ({
      originalId: payroll._id,
      employee: payroll.employee,
      weekEnding: payroll.weekEnding,
      workDays: payroll.workDays,
      halfDays: payroll.halfDays,
      totalHoursWorked: payroll.totalHoursWorked,
      overtimeHours: payroll.overtimeHours,
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      deductions: payroll.deductions,
      archivedBy,
      originalCreatedAt: payroll.createdAt
    }));

    // Insert into archive collection
    await ArchivedPayroll.insertMany(archivedPayrolls);

    // Delete original records
    const deleteResult = await Payroll.deleteMany({
      weekEnding: { $lt: beforeDate }
    });

    return {
      success: true,
      message: `Successfully archived ${deleteResult.deletedCount} payroll records`,
      archivedCount: deleteResult.deletedCount,
      beforeDate: moment(beforeDate).tz(TIMEZONE).format('YYYY-MM-DD')
    };
  } catch (error) {
    console.error('Error archiving payroll records:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Archive attendance records older than specified date
 * @param {Date} beforeDate - Archive records before this date
 * @param {String} archivedBy - User who initiated archive
 * @returns {Object} Archive result
 */
export const archiveAttendanceRecords = async (beforeDate, archivedBy = 'System') => {
  try {
    // Find attendance records to archive
    const attendancesToArchive = await Attendance.find({
      date: { $lt: beforeDate }
    });

    if (attendancesToArchive.length === 0) {
      return {
        success: true,
        message: 'No attendance records to archive',
        archivedCount: 0
      };
    }

    // Create archived copies
    const archivedAttendances = attendancesToArchive.map(attendance => ({
      originalId: attendance._id,
      employee: attendance.employee,
      date: attendance.date,
      timeIn: attendance.timeIn,
      timeOut: attendance.timeOut,
      status: attendance.status,
      actualHoursWorked: attendance.actualHoursWorked,
      overtimeHours: attendance.overtimeHours,
      dayType: attendance.dayType,
      timeInStatus: attendance.timeInStatus,
      archivedBy,
      originalCreatedAt: attendance.createdAt
    }));

    // Insert into archive collection
    await ArchivedAttendance.insertMany(archivedAttendances);

    // Delete original records
    const deleteResult = await Attendance.deleteMany({
      date: { $lt: beforeDate }
    });

    return {
      success: true,
      message: `Successfully archived ${deleteResult.deletedCount} attendance records`,
      archivedCount: deleteResult.deletedCount,
      beforeDate: moment(beforeDate).tz(TIMEZONE).format('YYYY-MM-DD')
    };
  } catch (error) {
    console.error('Error archiving attendance records:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Restore archived payroll records
 * @param {Date} startDate - Start date for restoration
 * @param {Date} endDate - End date for restoration
 * @returns {Object} Restore result
 */
export const restorePayrollRecords = async (startDate, endDate) => {
  try {
    // Find archived records to restore
    const archivedRecords = await ArchivedPayroll.find({
      weekEnding: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (archivedRecords.length === 0) {
      return {
        success: true,
        message: 'No archived payroll records found for restoration',
        restoredCount: 0
      };
    }

    // Create payroll records from archived data
    const restoredPayrolls = archivedRecords.map(archived => ({
      employee: archived.employee,
      weekEnding: archived.weekEnding,
      workDays: archived.workDays,
      halfDays: archived.halfDays,
      totalHoursWorked: archived.totalHoursWorked,
      overtimeHours: archived.overtimeHours,
      grossSalary: archived.grossSalary,
      totalDeductions: archived.totalDeductions,
      netSalary: archived.netSalary,
      deductions: archived.deductions,
      createdAt: archived.originalCreatedAt
    }));

    // Insert restored records
    await Payroll.insertMany(restoredPayrolls);

    // Delete from archive
    await ArchivedPayroll.deleteMany({
      weekEnding: {
        $gte: startDate,
        $lte: endDate
      }
    });

    return {
      success: true,
      message: `Successfully restored ${restoredPayrolls.length} payroll records`,
      restoredCount: restoredPayrolls.length
    };
  } catch (error) {
    console.error('Error restoring payroll records:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Restore archived attendance records
 * @param {Date} startDate - Start date for restoration
 * @param {Date} endDate - End date for restoration
 * @returns {Object} Restore result
 */
export const restoreAttendanceRecords = async (startDate, endDate) => {
  try {
    // Find archived records to restore
    const archivedRecords = await ArchivedAttendance.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (archivedRecords.length === 0) {
      return {
        success: true,
        message: 'No archived attendance records found for restoration',
        restoredCount: 0
      };
    }

    // Create attendance records from archived data
    const restoredAttendances = archivedRecords.map(archived => ({
      employee: archived.employee,
      date: archived.date,
      timeIn: archived.timeIn,
      timeOut: archived.timeOut,
      status: archived.status,
      actualHoursWorked: archived.actualHoursWorked,
      overtimeHours: archived.overtimeHours,
      dayType: archived.dayType,
      timeInStatus: archived.timeInStatus,
      createdAt: archived.originalCreatedAt
    }));

    // Insert restored records
    await Attendance.insertMany(restoredAttendances);

    // Delete from archive
    await ArchivedAttendance.deleteMany({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    return {
      success: true,
      message: `Successfully restored ${restoredAttendances.length} attendance records`,
      restoredCount: restoredAttendances.length
    };
  } catch (error) {
    console.error('Error restoring attendance records:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get archived payroll records
 * @param {Object} filter - Filter criteria
 * @returns {Object} Archived records
 */
export const getArchivedPayrolls = async (filter = {}) => {
  try {
    const archived = await ArchivedPayroll.find(filter)
      .populate('employee', 'employeeId firstName lastName email')
      .sort({ weekEnding: -1 })
      .limit(100);

    return {
      success: true,
      archived,
      count: archived.length
    };
  } catch (error) {
    console.error('Error getting archived payrolls:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get archived attendance records
 * @param {Object} filter - Filter criteria
 * @returns {Object} Archived records
 */
export const getArchivedAttendances = async (filter = {}) => {
  try {
    const archived = await ArchivedAttendance.find(filter)
      .populate('employee', 'employeeId firstName lastName email')
      .sort({ date: -1 })
      .limit(100);

    return {
      success: true,
      archived,
      count: archived.length
    };
  } catch (error) {
    console.error('Error getting archived attendances:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get archive statistics
 * @returns {Object} Statistics
 */
export const getArchiveStatistics = async () => {
  try {
    const [payrollCount, attendanceCount] = await Promise.all([
      ArchivedPayroll.countDocuments(),
      ArchivedAttendance.countDocuments()
    ]);

    // Get date ranges
    const oldestPayroll = await ArchivedPayroll.findOne().sort({ weekEnding: 1 });
    const newestPayroll = await ArchivedPayroll.findOne().sort({ weekEnding: -1 });
    const oldestAttendance = await ArchivedAttendance.findOne().sort({ date: 1 });
    const newestAttendance = await ArchivedAttendance.findOne().sort({ date: -1 });

    return {
      success: true,
      statistics: {
        payroll: {
          count: payrollCount,
          oldestRecord: oldestPayroll ? moment(oldestPayroll.weekEnding).format('YYYY-MM-DD') : null,
          newestRecord: newestPayroll ? moment(newestPayroll.weekEnding).format('YYYY-MM-DD') : null
        },
        attendance: {
          count: attendanceCount,
          oldestRecord: oldestAttendance ? moment(oldestAttendance.date).format('YYYY-MM-DD') : null,
          newestRecord: newestAttendance ? moment(newestAttendance.date).format('YYYY-MM-DD') : null
        }
      }
    };
  } catch (error) {
    console.error('Error getting archive statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  archivePayrollRecords,
  archiveAttendanceRecords,
  restorePayrollRecords,
  restoreAttendanceRecords,
  getArchivedPayrolls,
  getArchivedAttendances,
  getArchiveStatistics,
  ArchivedPayroll,
  ArchivedAttendance
};
