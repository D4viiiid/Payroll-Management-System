/**
 * 🤖 Automated Cron Jobs
 * Daily attendance summaries, cash advance reminders, and database backups
 */

import cron from 'node-cron';
import moment from 'moment-timezone';
import Employee from '../models/EmployeeModels.js';
import Attendance from '../models/AttendanceModels.js';
import CashAdvance from '../models/CashAdvance.model.js';
import EnhancedPayroll from '../models/EnhancedPayroll.model.js';
import { sendSystemAlert, sendCashAdvanceReminder } from '../services/emailService.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMEZONE = 'Asia/Manila';

/**
 * Generate daily attendance summary
 * Runs every day at 6:00 PM
 */
export const generateDailyAttendanceSummary = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DAILY ATTENDANCE SUMMARY GENERATION');
    console.log('='.repeat(60));
    console.log(`📅 Date: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Get today's date
    const today = moment().tz(TIMEZONE).startOf('day').toDate();
    const tomorrow = moment().tz(TIMEZONE).add(1, 'day').startOf('day').toDate();
    
    // Get all attendance records for today
    const attendances = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('employee', 'firstName lastName employeeId email');
    
    console.log(`👥 Found ${attendances.length} attendance records for today`);
    
    // Count different statuses
    const summary = {
      total: attendances.length,
      present: 0,
      halfDay: 0,
      late: 0,
      absent: 0,
      incomplete: 0,
      totalHoursWorked: 0,
      totalOvertimeHours: 0
    };
    
    const incompleteEmployees = [];
    const lateEmployees = [];
    const halfDayEmployees = [];
    
    attendances.forEach(att => {
      if (att.dayType === 'Full Day') {
        summary.present++;
      } else if (att.dayType === 'Half Day') {
        summary.halfDay++;
        halfDayEmployees.push(att.employee);
      } else if (att.dayType === 'Incomplete') {
        summary.incomplete++;
        incompleteEmployees.push(att.employee);
      }
      
      if (att.status === 'late') {
        summary.late++;
        lateEmployees.push(att.employee);
      }
      
      summary.totalHoursWorked += att.actualHoursWorked || 0;
      summary.totalOvertimeHours += att.overtimeHours || 0;
    });
    
    // Get total active employees
    const totalEmployees = await Employee.countDocuments({
      isActive: { $ne: false }
    });
    
    summary.absent = totalEmployees - attendances.length;
    
    // Log summary
    console.log('\n📊 Summary:');
    console.log(`  Total Employees: ${totalEmployees}`);
    console.log(`  ✅ Present (Full Day): ${summary.present}`);
    console.log(`  ⏰ Half Day: ${summary.halfDay}`);
    console.log(`  ⚠️  Late: ${summary.late}`);
    console.log(`  ❌ Absent: ${summary.absent}`);
    console.log(`  📝 Incomplete: ${summary.incomplete}`);
    console.log(`  ⏱️  Total Hours: ${summary.totalHoursWorked.toFixed(2)} hrs`);
    console.log(`  ⏱️  Overtime: ${summary.totalOvertimeHours.toFixed(2)} hrs`);
    
    // Send alert for incomplete attendance (employees who forgot to time out)
    if (incompleteEmployees.length > 0) {
      console.log('\n⚠️  Incomplete Attendance Alert:');
      incompleteEmployees.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      });
      
      // Get admin
      const admins = await Employee.find({ isAdmin: true, email: { $exists: true, $ne: '' } });
      
      if (admins.length > 0) {
        const employeeList = incompleteEmployees
          .map(emp => `${emp.firstName} ${emp.lastName} (${emp.employeeId})`)
          .join(', ');
        
        await sendSystemAlert(admins[0], {
          subject: 'Incomplete Attendance Records',
          message: `The following employees have incomplete attendance records for ${moment().tz(TIMEZONE).format('MMMM DD, YYYY')}:\n\n${employeeList}\n\nPlease review and update as necessary.`,
          severity: 'warning'
        });
      }
    }
    
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      date: today,
      summary
    };
    
  } catch (error) {
    console.error('\n❌ Error generating daily attendance summary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send cash advance payment reminders
 * Runs every Monday at 9:00 AM
 */
export const sendCashAdvanceReminders = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('💰 CASH ADVANCE PAYMENT REMINDERS');
    console.log('='.repeat(60));
    console.log(`📅 Date: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Get all approved and partially paid advances with upcoming deduction schedules
    const nextWeek = moment().tz(TIMEZONE).add(7, 'days').toDate();
    const advances = await CashAdvance.find({
      status: { $in: ['Approved', 'Partially Paid'] },
      remainingBalance: { $gt: 0 },
      deductionSchedule: { $lte: nextWeek }
    }).populate('employee', 'firstName lastName employeeId email');
    
    console.log(`💳 Found ${advances.length} advances due for deduction within next week`);
    
    let remindersSent = 0;
    
    for (const advance of advances) {
      if (!advance.employee || !advance.employee.email) {
        console.log(`  ⚠️  Skipping ${advance.advanceId} - No employee email`);
        continue;
      }
      
      console.log(`  📧 Sending reminder to ${advance.employee.firstName} ${advance.employee.lastName}`);
      
      // Send reminder via email
      const result = await sendCashAdvanceApproval(advance.employee, {
        ...advance.toObject(),
        approvalNotes: `Reminder: Your cash advance of ₱${advance.remainingBalance.toFixed(2)} is scheduled for deduction on ${moment(advance.deductionSchedule).tz(TIMEZONE).format('MMMM DD, YYYY')}.`
      });
      
      if (result.success) {
        remindersSent++;
      }
    }
    
    console.log(`\n✅ Sent ${remindersSent} reminders`);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      totalAdvances: advances.length,
      remindersSent
    };
    
  } catch (error) {
    console.error('\n❌ Error sending cash advance reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Backup database
 * Runs every day at 2:00 AM
 */
export const backupDatabase = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('💾 DATABASE BACKUP');
    console.log('='.repeat(60));
    console.log(`📅 Date: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not configured. Skipping backup.');
      return {
        success: false,
        message: 'Database URI not configured'
      };
    }
    
    // Create backup directory
    const backupDir = path.join(__dirname, '..', 'backups');
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }
    
    // Generate backup filename with timestamp
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD_HH-mm-ss');
    const backupPath = path.join(backupDir, `backup_${timestamp}`);
    
    console.log(`📦 Creating backup at: ${backupPath}`);
    
    // Use mongodump to create backup (requires MongoDB tools installed)
    try {
      const command = `mongodump --uri="${MONGODB_URI}" --out="${backupPath}"`;
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.log('⚠️  Backup warnings:', stderr);
      }
      
      console.log('✅ Backup completed successfully');
      console.log(stdout);
      
      // Clean up old backups (keep last 7 days)
      await cleanupOldBackups(backupDir, 7);
      
      console.log('='.repeat(60) + '\n');
      
      return {
        success: true,
        backupPath,
        timestamp
      };
      
    } catch (error) {
      console.error('❌ Backup command failed:', error.message);
      console.log('⚠️  Note: Ensure MongoDB tools (mongodump) are installed');
      console.log('='.repeat(60) + '\n');
      
      return {
        success: false,
        error: error.message,
        note: 'MongoDB tools may not be installed'
      };
    }
    
  } catch (error) {
    console.error('\n❌ Error in database backup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clean up old backups
 */
async function cleanupOldBackups(backupDir, daysToKeep) {
  try {
    const files = await fs.readdir(backupDir);
    const cutoffDate = moment().tz(TIMEZONE).subtract(daysToKeep, 'days');
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      const fileDate = moment(stats.mtime);
      
      if (fileDate.isBefore(cutoffDate)) {
        await fs.rm(filePath, { recursive: true, force: true });
        console.log(`  🗑️  Deleted old backup: ${file}`);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
    }
    
  } catch (error) {
    console.error('⚠️  Error cleaning up old backups:', error.message);
  }
}

/**
 * Generate weekly payroll summary report
 * Runs every Monday at 8:00 AM
 */
export const generateWeeklyReport = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📊 WEEKLY PAYROLL SUMMARY REPORT');
    console.log('='.repeat(60));
    
    // Get last Sunday
    const lastSunday = moment().tz(TIMEZONE).day(0).toDate(); // Sunday
    const previousMonday = moment(lastSunday).subtract(6, 'days').toDate();
    
    console.log(`📅 Pay Period: ${moment(previousMonday).format('YYYY-MM-DD')} to ${moment(lastSunday).format('YYYY-MM-DD')}`);
    
    // Get all payrolls for last week
    const payrolls = await EnhancedPayroll.find({
      'payPeriod.startDate': previousMonday,
      'payPeriod.endDate': lastSunday
    }).populate('employee', 'firstName lastName employeeId');
    
    console.log(`💼 Found ${payrolls.length} payroll records`);
    
    if (payrolls.length === 0) {
      console.log('⚠️  No payroll records found for last week');
      console.log('='.repeat(60) + '\n');
      return {
        success: true,
        message: 'No payroll records',
        count: 0
      };
    }
    
    // Calculate totals
    const totals = {
      totalEmployees: payrolls.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      totalOvertimePay: 0,
      totalCashAdvance: 0,
      totalWorkDays: 0,
      totalHalfDays: 0,
      totalOvertimeHours: 0
    };
    
    payrolls.forEach(p => {
      totals.totalGrossSalary += p.grossSalary || 0;
      totals.totalDeductions += p.totalDeductions || 0;
      totals.totalNetSalary += p.netSalary || 0;
      totals.totalOvertimePay += p.overtimePay || 0;
      totals.totalCashAdvance += p.cashAdvanceDeduction || 0;
      totals.totalWorkDays += p.workDays || 0;
      totals.totalHalfDays += p.halfDays || 0;
      totals.totalOvertimeHours += p.overtimeHours || 0;
    });
    
    console.log('\n📊 Weekly Summary:');
    console.log(`  👥 Employees Paid: ${totals.totalEmployees}`);
    console.log(`  💰 Total Gross: ₱${totals.totalGrossSalary.toFixed(2)}`);
    console.log(`  📉 Total Deductions: ₱${totals.totalDeductions.toFixed(2)}`);
    console.log(`  💵 Total Net: ₱${totals.totalNetSalary.toFixed(2)}`);
    console.log(`  ⏱️  Total Overtime Pay: ₱${totals.totalOvertimePay.toFixed(2)}`);
    console.log(`  💳 Total Cash Advance: ₱${totals.totalCashAdvance.toFixed(2)}`);
    
    // Send summary to admins
    const admins = await Employee.find({ isAdmin: true });
    const adminEmails = admins.map(a => a.email).filter(e => e);
    
    if (adminEmails.length > 0) {
      const report = `
Weekly Payroll Summary
Period: ${moment(previousMonday).format('MMMM DD')} - ${moment(lastSunday).format('MMMM DD, YYYY')}

📊 Summary:
- Employees Paid: ${totals.totalEmployees}
- Total Gross Salary: ₱${totals.totalGrossSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
- Total Deductions: ₱${totals.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
- Total Net Salary: ₱${totals.totalNetSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
- Total Overtime Pay: ₱${totals.totalOvertimePay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
- Total Cash Advance Deductions: ₱${totals.totalCashAdvance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}

📈 Attendance:
- Total Work Days: ${totals.totalWorkDays}
- Total Half Days: ${totals.totalHalfDays}
- Total Overtime Hours: ${totals.totalOvertimeHours.toFixed(2)} hrs
      `;
      
      await sendSystemAlert(
        adminEmails,
        'Weekly Payroll Summary',
        report,
        'info'
      );
      
      console.log('📧 Report sent to admins');
    }
    
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      payPeriod: {
        startDate: previousMonday,
        endDate: lastSunday
      },
      totals
    };
    
  } catch (error) {
    console.error('\n❌ Error generating weekly report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Auto-close attendance records after 10 hours
 * Runs every hour to check for open shifts
 * Prevents salary inflation from forgotten time-outs
 */
export const autoCloseAttendanceShifts = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('⏰ AUTO-CLOSE ATTENDANCE SHIFTS (10-HOUR LIMIT)');
    console.log('='.repeat(60));
    console.log(`📅 Date: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
    
    const now = moment().tz(TIMEZONE);
    const tenHoursAgo = now.clone().subtract(10, 'hours');
    
    // Find all open attendance records (has timeIn, no timeOut) older than 10 hours
    const openShifts = await Attendance.find({
      timeIn: { $exists: true, $ne: null },
      timeOut: null,
      timeIn: { $lte: tenHoursAgo.toDate() },
      archived: false
    }).populate('employee', 'firstName lastName employeeId dailyRate');
    
    console.log(`🔍 Found ${openShifts.length} open shift(s) exceeding 10 hours`);
    
    if (openShifts.length === 0) {
      console.log('✅ No shifts to auto-close');
      console.log('='.repeat(60) + '\n');
      return {
        success: true,
        closedCount: 0
      };
    }
    
    let closedCount = 0;
    const closedShifts = [];
    
    for (const shift of openShifts) {
      try {
        const timeIn = moment(shift.timeIn).tz(TIMEZONE);
        const autoTimeOut = timeIn.clone().add(10, 'hours');
        
        // Calculate hours worked (capped at 10 hours, excluding 1-hour lunch)
        const hoursWorked = 9; // 10 hours - 1 hour lunch = 9 hours max
        
        // Determine day type based on time-in
        const timeInHour = timeIn.hour();
        const timeInMinute = timeIn.minute();
        const isOnTime = timeInHour < 9 || (timeInHour === 9 && timeInMinute <= 30);
        
        const dayType = isOnTime ? 'Full Day' : 'Half Day';
        const dailyRate = shift.employee?.dailyRate || 550;
        
        // ✅ CRITICAL: Cap salary at full-day rate (₱550)
        // No overtime pay for auto-closed shifts
        const daySalary = dayType === 'Full Day' ? dailyRate : dailyRate * 0.5;
        const overtimeHours = Math.max(0, hoursWorked - 8);
        
        // Update the shift
        shift.timeOut = autoTimeOut.toDate();
        shift.dayType = dayType;
        shift.actualHoursWorked = hoursWorked;
        shift.overtimeHours = 0; // NO overtime pay for auto-closed
        shift.daySalary = daySalary;
        shift.overtimePay = 0; // NO overtime pay
        shift.totalPay = daySalary;
        shift.isValidDay = true;
        shift.timeInStatus = isOnTime ? 'On Time' : 'Half Day';
        shift.notes = `[Auto-closed after 10 hours] Extra ${overtimeHours.toFixed(2)}hrs not paid. Max pay: ₱${daySalary.toFixed(2)}`;
        shift.validationReason = 'Auto-closed at 10-hour limit to prevent salary inflation';
        
        await shift.save();
        
        console.log(`  ✅ Auto-closed: ${shift.employee.firstName} ${shift.employee.lastName} (${shift.employee.employeeId})`);
        console.log(`     Time In: ${timeIn.format('h:mm A')}`);
        console.log(`     Auto Time Out: ${autoTimeOut.format('h:mm A')}`);
        console.log(`     Day Type: ${dayType}`);
        console.log(`     Pay: ₱${daySalary.toFixed(2)} (capped, no OT)`);
        
        closedCount++;
        closedShifts.push({
          employeeId: shift.employee.employeeId,
          employeeName: `${shift.employee.firstName} ${shift.employee.lastName}`,
          timeIn: timeIn.format('h:mm A'),
          autoTimeOut: autoTimeOut.format('h:mm A'),
          dayType,
          pay: daySalary
        });
        
      } catch (error) {
        console.error(`  ❌ Error closing shift for ${shift.employee?.employeeId}:`, error.message);
      }
    }
    
    console.log(`\n✅ Auto-closed ${closedCount} shift(s)`);
    console.log('='.repeat(60) + '\n');
    
    // Send alert to admins if shifts were auto-closed
    if (closedCount > 0) {
      const admins = await Employee.find({ isAdmin: true, email: { $exists: true, $ne: '' } });
      
      if (admins.length > 0) {
        const shiftList = closedShifts
          .map(s => `${s.employeeName} (${s.employeeId}): ${s.timeIn} - ${s.autoTimeOut} = ${s.dayType} (₱${s.pay.toFixed(2)})`)
          .join('\n');
        
        await sendSystemAlert(admins[0], {
          subject: `Auto-Closed ${closedCount} Attendance Shift(s)`,
          message: `The following attendance shifts were automatically closed after 10 hours to prevent salary inflation:\n\n${shiftList}\n\nNo overtime pay was applied. All shifts capped at their respective day rates.`,
          severity: 'warning'
        });
      }
    }
    
    return {
      success: true,
      closedCount,
      closedShifts
    };
    
  } catch (error) {
    console.error('\n❌ Error auto-closing attendance shifts:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Schedule all cron jobs
 */
export const scheduleAllJobs = () => {
  const jobs = {};
  
  console.log('\n🤖 Scheduling automated jobs...');
  
  // Auto-close attendance shifts (Every hour)
  jobs.autoCloseShifts = cron.schedule('0 * * * *', async () => {
    console.log('\n🔔 Cron trigger: Auto-close attendance shifts');
    await autoCloseAttendanceShifts();
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('  ✅ Auto-close attendance shifts: Every hour');
  
  // Daily attendance summary (6:00 PM daily)
  jobs.attendanceSummary = cron.schedule('0 18 * * *', async () => {
    console.log('\n🔔 Cron trigger: Daily attendance summary');
    await generateDailyAttendanceSummary();
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('  ✅ Daily attendance summary: 6:00 PM daily');
  
  // Cash advance reminders (9:00 AM every Monday)
  jobs.cashAdvanceReminders = cron.schedule('0 9 * * 1', async () => {
    console.log('\n🔔 Cron trigger: Cash advance reminders');
    await sendCashAdvanceReminders();
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('  ✅ Cash advance reminders: 9:00 AM every Monday');
  
  // Database backup (2:00 AM daily)
  jobs.databaseBackup = cron.schedule('0 2 * * *', async () => {
    console.log('\n🔔 Cron trigger: Database backup');
    await backupDatabase();
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('  ✅ Database backup: 2:00 AM daily');
  
  // Weekly payroll report (8:00 AM every Monday)
  jobs.weeklyReport = cron.schedule('0 8 * * 1', async () => {
    console.log('\n🔔 Cron trigger: Weekly report');
    await generateWeeklyReport();
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('  ✅ Weekly report: 8:00 AM every Monday');
  
  console.log('✅ All cron jobs scheduled successfully\n');
  
  return jobs;
};

export default {
  autoCloseAttendanceShifts,
  generateDailyAttendanceSummary,
  sendCashAdvanceReminders,
  backupDatabase,
  generateWeeklyReport,
  scheduleAllJobs
};
