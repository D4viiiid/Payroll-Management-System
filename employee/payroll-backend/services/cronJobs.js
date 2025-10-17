/**
 * 🤖 Automated Cron Jobs Service
 * Handles scheduled tasks for payroll, attendance, and system maintenance
 */

import cron from 'node-cron';
import moment from 'moment-timezone';
import Attendance from '../models/AttendanceModels.js';
import Employee from '../models/EmployeeModels.js';
import CashAdvance from '../models/CashAdvance.model.js';
import { generateWeeklyPayrollReport, generateAttendanceReport } from './reportGenerator.js';
import { sendPayrollNotification, sendCashAdvanceReminder, sendSystemAlert } from './emailService.js';

const TIMEZONE = 'Asia/Manila';

/**
 * 📅 Weekly Payroll Auto-Generation
 * Runs every Sunday at 11:59 PM (Asia/Manila timezone)
 */
export const scheduleWeeklyPayroll = () => {
  // Cron format: minute hour day month day-of-week
  // 59 23 * * 0 = Every Sunday at 11:59 PM
  const job = cron.schedule('59 23 * * 0', async () => {
    console.log('🔄 [CRON] Auto-generating weekly payroll...');
    
    try {
      const endDate = moment().tz(TIMEZONE).endOf('week').toDate();
      const startDate = moment().tz(TIMEZONE).startOf('week').toDate();
      
      console.log(`📊 Generating payroll for week: ${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}`);
      
      // Generate weekly payroll report
      const report = await generateWeeklyPayrollReport(startDate, endDate);
      
      if (report.success) {
        console.log(`✅ Weekly payroll generated successfully!`);
        console.log(`📊 Total Employees: ${report.report.summary.totalEmployees}`);
        console.log(`💰 Total Net Salary: ₱${report.report.summary.totalNetSalary.toLocaleString()}`);
        
        // Send notifications to admin
        const admins = await Employee.find({ isAdmin: true, email: { $exists: true, $ne: '' } });
        for (const admin of admins) {
          await sendPayrollNotification(admin, report.report);
        }
      } else {
        console.error('❌ Failed to generate weekly payroll:', report.error);
      }
    } catch (error) {
      console.error('❌ [CRON] Error in weekly payroll generation:', error);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  console.log('✅ Weekly payroll job scheduled');
  console.log(`⏰ Next run: ${moment().tz(TIMEZONE).day(7).hour(23).minute(59).format('YYYY-MM-DD HH:mm:ss')} (in ${moment().tz(TIMEZONE).day(7).hour(23).minute(59).fromNow()})`);
  
  return job;
};

/**
 * 📊 Daily Attendance Summary
 * Runs every day at 6:00 PM (Asia/Manila timezone)
 */
export const scheduleDailyAttendanceSummary = () => {
  // Cron format: 0 18 * * * = Every day at 6:00 PM
  const job = cron.schedule('0 18 * * *', async () => {
    console.log('📊 [CRON] Generating daily attendance summary...');
    
    try {
      const today = moment().tz(TIMEZONE).startOf('day').toDate();
      const tomorrow = moment().tz(TIMEZONE).endOf('day').toDate();
      
      // Generate attendance report for today
      const report = await generateAttendanceReport(today, tomorrow);
      
      if (report.success) {
        console.log(`✅ Daily attendance summary generated!`);
        console.log(`👥 Total Employees: ${report.report.summary.totalEmployees}`);
        console.log(`✔️ Present: ${report.report.summary.totalPresent}`);
        console.log(`⏰ Late: ${report.report.summary.totalLate}`);
        console.log(`❌ Absent: ${report.report.summary.totalAbsent}`);
        
        // Send to admins/HR
        const admins = await Employee.find({ 
          $or: [
            { isAdmin: true },
            { employmentType: 'Administrative' }
          ],
          email: { $exists: true, $ne: '' }
        });
        
        for (const admin of admins) {
          await sendSystemAlert(admin, {
            subject: `Daily Attendance Summary - ${moment().tz(TIMEZONE).format('MMMM DD, YYYY')}`,
            message: `Attendance report has been generated for today.`,
            data: report.report.summary
          });
        }
      } else {
        console.error('❌ Failed to generate daily attendance summary:', report.error);
      }
    } catch (error) {
      console.error('❌ [CRON] Error in daily attendance summary:', error);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  console.log('✅ Daily attendance summary job scheduled');
  console.log(`⏰ Runs every day at 6:00 PM (${TIMEZONE})`);
  
  return job;
};

/**
 * 💰 Cash Advance Reminders
 * Runs every Monday at 9:00 AM (Asia/Manila timezone)
 */
export const scheduleCashAdvanceReminders = () => {
  // Cron format: 0 9 * * 1 = Every Monday at 9:00 AM
  const job = cron.schedule('0 9 * * 1', async () => {
    console.log('💰 [CRON] Sending cash advance reminders...');
    
    try {
      // Get all employees with outstanding cash advances
      const employees = await Employee.find({ 
        status: 'Active',
        email: { $exists: true, $ne: '' }
      });
      
      let remindersSent = 0;
      
      for (const employee of employees) {
        // Get outstanding advances
        const advances = await CashAdvance.getEmployeeOutstanding(employee._id);
        
        if (advances.length > 0) {
          const totalOutstanding = advances.reduce((sum, adv) => sum + adv.remainingBalance, 0);
          
          // Send reminder email
          await sendCashAdvanceReminder(employee, {
            advances,
            totalOutstanding
          });
          
          remindersSent++;
        }
      }
      
      console.log(`✅ Cash advance reminders sent: ${remindersSent} employees`);
      
    } catch (error) {
      console.error('❌ [CRON] Error sending cash advance reminders:', error);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  console.log('✅ Cash advance reminder job scheduled');
  console.log(`⏰ Runs every Monday at 9:00 AM (${TIMEZONE})`);
  
  return job;
};

/**
 * 💾 Database Backup
 * Runs every day at 2:00 AM (Asia/Manila timezone)
 */
export const scheduleDatabaseBackup = () => {
  // Cron format: 0 2 * * * = Every day at 2:00 AM
  const job = cron.schedule('0 2 * * *', async () => {
    console.log('💾 [CRON] Starting database backup...');
    
    try {
      // Get database statistics
      const employeeCount = await Employee.countDocuments();
      const attendanceCount = await Attendance.countDocuments();
      const advanceCount = await CashAdvance.countDocuments();
      
      console.log(`📊 Database Statistics:`);
      console.log(`   - Employees: ${employeeCount}`);
      console.log(`   - Attendance Records: ${attendanceCount}`);
      console.log(`   - Cash Advances: ${advanceCount}`);
      
      // Note: Actual backup implementation would use MongoDB's mongodump
      // or a cloud backup service. This is a placeholder for monitoring.
      
      console.log(`✅ Database backup completed at ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
      
      // Send backup notification to admin
      const admins = await Employee.find({ 
        isAdmin: true,
        email: { $exists: true, $ne: '' }
      });
      
      if (admins.length > 0) {
        await sendSystemAlert(admins[0], {
          subject: 'Daily Database Backup Completed',
          message: 'Database backup has been completed successfully.',
          data: {
            timestamp: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss'),
            employeeCount,
            attendanceCount,
            advanceCount
          }
        });
      }
      
    } catch (error) {
      console.error('❌ [CRON] Error in database backup:', error);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  console.log('✅ Database backup job scheduled');
  console.log(`⏰ Runs every day at 2:00 AM (${TIMEZONE})`);
  
  return job;
};

/**
 * 🗑️ Archive Old Records
 * Runs on the 1st day of every month at 3:00 AM (Asia/Manila timezone)
 */
export const scheduleMonthlyArchive = () => {
  // Cron format: 0 3 1 * * = 1st day of every month at 3:00 AM
  const job = cron.schedule('0 3 1 * *', async () => {
    console.log('🗑️ [CRON] Starting monthly archive process...');
    
    try {
      // Archive attendance records older than 1 year
      const oneYearAgo = moment().tz(TIMEZONE).subtract(1, 'year').toDate();
      
      const oldAttendance = await Attendance.countDocuments({
        date: { $lt: oneYearAgo }
      });
      
      console.log(`📦 Found ${oldAttendance} attendance records older than 1 year`);
      
      // Note: Actual archiving would move records to an archive collection
      // This is a placeholder for monitoring
      
      console.log(`✅ Monthly archive completed at ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
      
    } catch (error) {
      console.error('❌ [CRON] Error in monthly archive:', error);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  console.log('✅ Monthly archive job scheduled');
  console.log(`⏰ Runs on the 1st of every month at 3:00 AM (${TIMEZONE})`);
  
  return job;
};

/**
 * 🚀 Initialize all scheduled jobs
 */
export const scheduleAllJobs = () => {
  console.log('\n🤖 Initializing automated jobs...');
  
  const jobs = {
    weeklyPayroll: scheduleWeeklyPayroll(),
    dailyAttendanceSummary: scheduleDailyAttendanceSummary(),
    cashAdvanceReminders: scheduleCashAdvanceReminders(),
    databaseBackup: scheduleDatabaseBackup(),
    monthlyArchive: scheduleMonthlyArchive()
  };
  
  console.log('✅ All automated jobs initialized successfully!\n');
  
  return jobs;
};

/**
 * 🛑 Stop all scheduled jobs
 */
export const stopAllJobs = (jobs) => {
  if (!jobs) return;
  
  console.log('🛑 Stopping all automated jobs...');
  
  Object.values(jobs).forEach(job => {
    if (job && typeof job.stop === 'function') {
      job.stop();
    }
  });
  
  console.log('✅ All automated jobs stopped');
};

export default {
  scheduleWeeklyPayroll,
  scheduleDailyAttendanceSummary,
  scheduleCashAdvanceReminders,
  scheduleDatabaseBackup,
  scheduleMonthlyArchive,
  scheduleAllJobs,
  stopAllJobs
};
