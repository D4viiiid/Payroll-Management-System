/**
 * 📅 Weekly Payroll Automation Job
 * Automatically generates payroll every Sunday at 11:59 PM
 * Uses node-cron for scheduling
 */

import cron from 'node-cron';
import Employee from '../models/EmployeeModels.js';
import EnhancedPayroll from '../models/EnhancedPayroll.model.js';
import { 
  getNextSunday, 
  getPreviousMonday, 
  calculateEmployeePayroll 
} from '../services/payrollCalculator.js';
import moment from 'moment-timezone';

const TIMEZONE = 'Asia/Manila';

/**
 * Generate payroll for all active employees for the week
 */
export const generateWeeklyPayroll = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AUTOMATED WEEKLY PAYROLL GENERATION');
    console.log('='.repeat(60));
    console.log(`📅 Started at: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Calculate pay period (Monday to Sunday)
    const sunday = getNextSunday();
    const monday = getPreviousMonday(sunday);
    
    console.log(`📊 Pay Period: ${monday.toISOString().split('T')[0]} to ${sunday.toISOString().split('T')[0]}`);
    
    // Get all active employees
    const employees = await Employee.find({ 
      isActive: { $ne: false }
    });
    
    console.log(`👥 Found ${employees.length} active employees`);
    
    if (employees.length === 0) {
      console.log('⚠️  No active employees found. Skipping payroll generation.');
      return {
        success: true,
        message: 'No active employees',
        generated: 0,
        skipped: 0,
        failed: 0
      };
    }
    
    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const results = [];
    
    // Process each employee
    for (const employee of employees) {
      try {
        console.log(`\n💼 Processing: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
        
        // Check if payroll already exists for this period
        const existing = await EnhancedPayroll.findOne({
          employee: employee._id,
          'payPeriod.startDate': monday,
          'payPeriod.endDate': sunday
        });
        
        if (existing) {
          console.log(`  ⏭️  Payroll already exists (Status: ${existing.status})`);
          skipped++;
          results.push({
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            status: 'skipped',
            reason: 'Payroll already exists',
            existingPayroll: existing._id
          });
          continue;
        }
        
        // Calculate payroll
        const payrollData = await calculateEmployeePayroll(
          employee._id,
          monday.toISOString().split('T')[0],
          sunday.toISOString().split('T')[0]
        );
        
        if (!payrollData) {
          console.log(`  ❌ Failed to calculate payroll`);
          failed++;
          results.push({
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            status: 'failed',
            reason: 'Calculation failed'
          });
          continue;
        }
        
        console.log(`  ✅ Generated payroll - Net Salary: ₱${payrollData.netSalary.toFixed(2)}`);
        generated++;
        results.push({
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          status: 'generated',
          payrollId: payrollData._id,
          netSalary: payrollData.netSalary,
          workDays: payrollData.workDays,
          halfDays: payrollData.halfDays
        });
        
      } catch (error) {
        console.error(`  ❌ Error processing ${employee.employeeId}:`, error.message);
        failed++;
        results.push({
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          status: 'failed',
          reason: error.message
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PAYROLL GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Generated: ${generated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📅 Completed at: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      message: 'Weekly payroll generation completed',
      generated,
      skipped,
      failed,
      results,
      payPeriod: {
        startDate: monday,
        endDate: sunday
      }
    };
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR in weekly payroll generation:', error);
    return {
      success: false,
      error: error.message,
      generated: 0,
      skipped: 0,
      failed: 0
    };
  }
};

/**
 * Schedule weekly payroll generation
 * Runs every Sunday at 11:59 PM (Philippines timezone)
 */
export const scheduleWeeklyPayroll = () => {
  // Schedule: Every Sunday at 11:59 PM
  // Cron format: minute hour day-of-month month day-of-week
  // '59 23 * * 0' = 59th minute, 23rd hour (11 PM), every month, every day-of-month, Sunday (0)
  
  const cronSchedule = '59 23 * * 0'; // Sunday 11:59 PM
  
  console.log('📅 Scheduling weekly payroll automation...');
  console.log(`⏰ Schedule: Every Sunday at 11:59 PM (${TIMEZONE})`);
  
  const job = cron.schedule(cronSchedule, async () => {
    console.log('\n🔔 Cron job triggered: Weekly payroll generation');
    await generateWeeklyPayroll();
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  
  console.log('✅ Weekly payroll job scheduled successfully');
  
  return job;
};

/**
 * Manual trigger for testing
 */
export const triggerPayrollManually = async () => {
  console.log('🔧 Manual trigger: Generating weekly payroll...');
  return await generateWeeklyPayroll();
};

/**
 * Get next scheduled run time
 */
export const getNextRunTime = () => {
  const now = moment().tz(TIMEZONE);
  let nextSunday = now.clone().day(7); // Next Sunday
  
  // If it's already past Sunday 11:59 PM, get next week's Sunday
  if (now.day() === 0 && now.hour() >= 23 && now.minute() >= 59) {
    nextSunday.add(7, 'days');
  }
  
  nextSunday.hour(23).minute(59).second(0);
  
  return {
    nextRun: nextSunday.format('YYYY-MM-DD HH:mm:ss'),
    daysUntil: nextSunday.diff(now, 'days'),
    hoursUntil: nextSunday.diff(now, 'hours'),
    humanReadable: nextSunday.fromNow()
  };
};

/**
 * Check if payroll has been generated for current week
 */
export const checkCurrentWeekPayroll = async () => {
  try {
    const sunday = getNextSunday();
    const monday = getPreviousMonday(sunday);
    
    const count = await EnhancedPayroll.countDocuments({
      'payPeriod.startDate': monday,
      'payPeriod.endDate': sunday
    });
    
    const totalEmployees = await Employee.countDocuments({
      isActive: { $ne: false }
    });
    
    return {
      payPeriod: {
        startDate: monday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0]
      },
      generated: count,
      totalEmployees,
      complete: count === totalEmployees,
      percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0
    };
    
  } catch (error) {
    console.error('Error checking current week payroll:', error);
    return null;
  }
};

export default {
  scheduleWeeklyPayroll,
  generateWeeklyPayroll,
  triggerPayrollManually,
  getNextRunTime,
  checkCurrentWeekPayroll
};
