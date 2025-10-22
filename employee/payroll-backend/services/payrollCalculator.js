import mongoose from 'mongoose';
import Employee from '../models/EmployeeModels.js';
import AttendanceModel from '../models/AttendanceModels.js';
import MandatoryDeduction from '../models/MandatoryDeduction.model.js';
import CashAdvance from '../models/CashAdvance.model.js';
import EnhancedPayroll from '../models/EnhancedPayroll.model.js';
import SalaryRate from '../models/SalaryRate.model.js';
import { 
  validateAndCalculateAttendance, 
  calculateAttendanceSummary as calcAttendanceSummary 
} from '../utils/attendanceCalculator.js';

/**
 * 🧮 Payroll Calculator Service
 * Comprehensive service for calculating employee payroll with all deductions
 * Updated to use Phase 2 enhanced attendance validation
 */

/**
 * Get next Sunday date (payroll cutoff)
 */
export const getNextSunday = (date = new Date()) => {
  const nextSunday = new Date(date);
  nextSunday.setDate(date.getDate() + (7 - date.getDay()));
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday;
};

/**
 * Get previous Monday (start of pay period)
 */
export const getPreviousMonday = (sunday) => {
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Calculate work hours excluding lunch break (12:00-12:59 PM)
 */
export const calculateWorkHours = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;

  const timeInDate = new Date(timeIn);
  const timeOutDate = new Date(timeOut);
  
  let totalMinutes = (timeOutDate - timeInDate) / (1000 * 60);
  
  // Check if work period spans lunch hour (12:00-12:59 PM)
  const lunchStart = new Date(timeInDate);
  lunchStart.setHours(12, 0, 0, 0);
  const lunchEnd = new Date(timeInDate);
  lunchEnd.setHours(12, 59, 59, 999);
  
  if (timeInDate <= lunchEnd && timeOutDate >= lunchStart) {
    // Subtract 1 hour (60 minutes) for lunch
    totalMinutes -= 60;
  }
  
  return Math.max(0, totalMinutes / 60); // Return hours
};

/**
 * Determine attendance status based on time in
 */
export const determineAttendanceStatus = (timeIn) => {
  if (!timeIn) return { status: 'absent', salaryMultiplier: 0 };
  
  const timeInDate = new Date(timeIn);
  const hour = timeInDate.getHours();
  const minute = timeInDate.getMinutes();
  
  // Full Day: 08:00 - 09:30 AM
  if ((hour === 8) || (hour === 9 && minute <= 30)) {
    return {
      status: 'present',
      salaryMultiplier: 1, // Full day salary
      type: 'Full Day'
    };
  }
  
  // Half Day: 09:31 AM onwards
  if (hour >= 9 && minute >= 31) {
    return {
      status: 'half-day',
      salaryMultiplier: 0.5, // Half day salary
      type: 'Half Day'
    };
  }
  
  return { status: 'late', salaryMultiplier: 0.5 };
};

/**
 * Get attendance summary for employee in pay period
 * Updated to use Phase 2 enhanced attendance validation and CURRENT SALARY RATE
 */
export const getAttendanceSummary = async (employeeId, startDate, endDate) => {
  // Fetch employee details
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  // ✅ FIX: Get current salary rate from SalaryRate collection
  const currentRate = await SalaryRate.getCurrentRate();
  const dailyRate = currentRate.dailyRate;
  const overtimeRate = currentRate.overtimeRate;

  console.log(`📊 Using current salary rate for payroll: Daily=₱${dailyRate}, OT=₱${overtimeRate}`);

  // Fetch attendance records
  const attendances = await AttendanceModel.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    },
    archived: { $ne: true }
  }).sort({ date: 1 });

  // If no attendance records, return empty summary
  if (attendances.length === 0) {
    return {
      workDays: 0,
      halfDays: 0,
      totalHoursWorked: 0,
      overtimeHours: 0,
      totalDays: 0,
      processedRecords: []
    };
  }

  // Convert attendance records to format expected by calculator
  const attendanceRecords = attendances.map(att => ({
    timeIn: att.timeIn ? att.timeIn.toISOString().split('T')[1].substring(0, 8) : null,
    timeOut: att.timeOut ? att.timeOut.toISOString().split('T')[1].substring(0, 8) : null,
    date: att.date.toISOString().split('T')[0],
    _id: att._id
  }));

  // Use the new attendance calculator with CURRENT SALARY RATE
  const { summary, processedRecords } = calcAttendanceSummary(attendanceRecords, {
    dailyRate: dailyRate,
    overtimeRate: overtimeRate
  });

  // Update attendance records in database with calculated values using CURRENT RATE
  for (const processed of processedRecords) {
    if (processed._id) {
      await AttendanceModel.findByIdAndUpdate(processed._id, {
        timeInStatus: processed.timeInStatus,
        dayType: processed.dayType,
        actualHoursWorked: parseFloat(processed.hoursWorked) || 0,
        overtimeHours: parseFloat(processed.overtimeHours) || 0,
        daySalary: parseFloat(processed.daySalary) || 0,
        overtimePay: parseFloat(processed.overtimePay) || 0,
        totalPay: parseFloat(processed.totalPay) || 0,
        validationReason: processed.reason,
        isValidDay: processed.isValid,
        // Update legacy status field for backward compatibility
        status: processed.dayType === 'Full Day' ? 'present' : 
                processed.dayType === 'Half Day' ? 'half-day' : 
                processed.dayType === 'Absent' ? 'absent' : 'late'
      });
    }
  }

  return {
    workDays: summary.fullDays,
    halfDays: summary.halfDays,
    totalHoursWorked: parseFloat(summary.totalHoursWorked),
    overtimeHours: parseFloat(summary.totalOvertimeHours),
    totalDays: summary.totalDays,
    processedRecords
  };
};

/**
 * Calculate basic salary using CURRENT SALARY RATE
 */
export const calculateBasicSalary = async (workDays, halfDays) => {
  // ✅ FIX: Get current salary rate from database
  const currentRate = await SalaryRate.getCurrentRate();
  const dailyRate = currentRate.dailyRate;
  
  const fullDaySalary = workDays * dailyRate;
  const halfDaySalary = halfDays * (dailyRate / 2);
  
  console.log(`💰 Basic Salary: ${workDays} full days + ${halfDays} half days @ ₱${dailyRate}/day = ₱${fullDaySalary + halfDaySalary}`);
  
  return Math.round((fullDaySalary + halfDaySalary) * 100) / 100;
};

/**
 * Calculate overtime pay using CURRENT SALARY RATE
 */
export const calculateOvertimePay = async (overtimeHours) => {
  // ✅ FIX: Get current salary rate from database
  const currentRate = await SalaryRate.getCurrentRate();
  const overtimeRate = currentRate.overtimeRate;
  
  const overtimePay = overtimeHours * overtimeRate;
  
  console.log(`⏰ Overtime Pay: ${overtimeHours} hrs @ ₱${overtimeRate}/hr = ₱${overtimePay}`);
  
  return Math.round(overtimePay * 100) / 100;
};

/**
 * Calculate gross salary
 */
export const calculateGrossSalary = (basicSalary, overtimePay) => {
  return Math.round((basicSalary + overtimePay) * 100) / 100;
};

/**
 * Get applicable mandatory deductions for employee
 */
export const getMandatoryDeductions = async (employee, grossSalary) => {
  const deductions = await MandatoryDeduction.getActiveDeductions(
    employee.employmentType,
    new Date()
  );
  
  const applicableDeductions = [];
  
  for (const deduction of deductions) {
    if (deduction.isApplicableToEmployee(employee)) {
      const amount = deduction.calculateAmount(grossSalary);
      
      if (amount > 0) {
        applicableDeductions.push({
          deductionName: deduction.deductionName,
          amount: Math.round(amount * 100) / 100,
          percentageRate: deduction.deductionType === 'Percentage' ? deduction.percentageRate : null,
          calculationType: deduction.deductionType
        });
      }
    }
  }
  
  return applicableDeductions;
};

/**
 * Get cash advance deductions for employee
 */
export const getCashAdvanceDeduction = async (employeeId) => {
  const totalOutstanding = await CashAdvance.getTotalOutstanding(employeeId);
  
  // Deduct outstanding cash advances from payroll
  return Math.round(totalOutstanding * 100) / 100;
};

/**
 * Calculate total deductions
 */
export const calculateTotalDeductions = (mandatoryDeductions, cashAdvanceDeduction, otherDeductions = 0) => {
  const mandatoryTotal = mandatoryDeductions.reduce((sum, d) => sum + d.amount, 0);
  return Math.round((mandatoryTotal + cashAdvanceDeduction + otherDeductions) * 100) / 100;
};

/**
 * Calculate net salary
 */
export const calculateNetSalary = (grossSalary, totalDeductions) => {
  const netSalary = grossSalary - totalDeductions;
  return Math.max(0, Math.round(netSalary * 100) / 100);
};

/**
 * Get employee YTD (Year-to-Date) earnings
 */
export const getEmployeeYTD = async (employeeId, year = new Date().getFullYear()) => {
  const ytdData = await EnhancedPayroll.getEmployeeYTD(employeeId, year);
  
  if (ytdData && ytdData.length > 0) {
    return ytdData[0].yearToDateNet || 0;
  }
  
  return 0;
};

/**
 * 🎯 MAIN FUNCTION: Calculate complete payroll for employee
 * Uses CURRENT SALARY RATE from SalaryRate collection
 */
export const calculateEmployeePayroll = async (employeeId, startDate, endDate) => {
  try {
    // 1. Get employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // 2. Validate end date is Sunday
    if (endDate.getDay() !== 0) {
      throw new Error('Payroll cutoff must be on Sunday');
    }
    
    // 3. Get attendance summary (this now uses current salary rate)
    const attendanceSummary = await getAttendanceSummary(employeeId, startDate, endDate);
    
    // 4. Calculate basic salary (this now fetches current rate)
    const basicSalary = await calculateBasicSalary(
      attendanceSummary.workDays,
      attendanceSummary.halfDays
    );
    
    // 5. Calculate overtime pay (this now fetches current rate)
    const overtimePay = await calculateOvertimePay(attendanceSummary.overtimeHours);
    
    // 6. Calculate gross salary
    const grossSalary = calculateGrossSalary(basicSalary, overtimePay);
    
    // 7. Get mandatory deductions
    const mandatoryDeductions = await getMandatoryDeductions(employee, grossSalary);
    
    // 8. Get cash advance deduction
    const cashAdvanceDeduction = await getCashAdvanceDeduction(employeeId);
    
    // 9. Calculate total deductions
    const totalDeductions = calculateTotalDeductions(
      mandatoryDeductions,
      cashAdvanceDeduction,
      0 // otherDeductions
    );
    
    // 10. Calculate net salary
    const netSalary = calculateNetSalary(grossSalary, totalDeductions);
    
    // 11. Get YTD
    const currentYTD = await getEmployeeYTD(employeeId, endDate.getFullYear());
    const newYTD = currentYTD + netSalary;
    
    // 12. Get current salary rate for reference
    const currentRate = await SalaryRate.getCurrentRate();
    
    console.log(`✅ Payroll calculated for ${employee.firstName} ${employee.lastName}: Net Pay = ₱${netSalary}`);
    
    // 13. Create payroll object
    const payrollData = {
      employee: employeeId,
      payPeriod: {
        startDate,
        endDate
      },
      workDays: attendanceSummary.workDays,
      halfDays: attendanceSummary.halfDays,
      totalHoursWorked: attendanceSummary.totalHoursWorked,
      overtimeHours: attendanceSummary.overtimeHours,
      basicSalary,
      overtimePay,
      grossSalary,
      mandatoryDeductions,
      cashAdvanceDeduction,
      otherDeductions: 0,
      totalDeductions,
      netSalary,
      yearToDate: newYTD,
      status: 'Draft',
      // ✅ Store salary rate used for calculation
      salaryRateUsed: {
        dailyRate: currentRate.dailyRate,
        hourlyRate: currentRate.hourlyRate,
        overtimeRate: currentRate.overtimeRate,
        effectiveDate: currentRate.effectiveDate
      }
    };
    
    return {
      success: true,
      payroll: payrollData,
      summary: {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        employmentType: employee.employmentType,
        payPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        workDays: attendanceSummary.workDays,
        halfDays: attendanceSummary.halfDays,
        totalHours: attendanceSummary.totalHoursWorked,
        overtimeHours: attendanceSummary.overtimeHours,
        basicSalary: `₱${basicSalary.toLocaleString()}`,
        overtimePay: `₱${overtimePay.toLocaleString()}`,
        grossSalary: `₱${grossSalary.toLocaleString()}`,
        totalDeductions: `₱${totalDeductions.toLocaleString()}`,
        netSalary: `₱${netSalary.toLocaleString()}`,
        yearToDate: `₱${newYTD.toLocaleString()}`,
        salaryRateUsed: `₱${currentRate.dailyRate}/day (₱${currentRate.hourlyRate}/hr, ₱${currentRate.overtimeRate}/hr OT)`
      }
    };
  } catch (error) {
    console.error('❌ Error calculating payroll:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🎯 Calculate payroll for all active employees
 */
export const calculateBulkPayroll = async (startDate, endDate) => {
  try {
    const employees = await Employee.find({ isActive: true });
    const results = [];
    
    for (const employee of employees) {
      const result = await calculateEmployeePayroll(employee._id, startDate, endDate);
      results.push(result);
    }
    
    return {
      success: true,
      totalEmployees: employees.length,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🎯 Generate weekly payroll (auto-called by cron job)
 */
export const generateWeeklyPayroll = async () => {
  try {
    const today = new Date();
    const nextSunday = getNextSunday(today);
    const startDate = getPreviousMonday(nextSunday);
    
    console.log(`📊 Generating weekly payroll for ${startDate.toLocaleDateString()} - ${nextSunday.toLocaleDateString()}`);
    
    const result = await calculateBulkPayroll(startDate, nextSunday);
    
    if (result.success) {
      // Save all payroll records
      const savedPayrolls = [];
      for (const payrollResult of result.results) {
        if (payrollResult.success) {
          const payroll = new EnhancedPayroll(payrollResult.payroll);
          await payroll.save();
          savedPayrolls.push(payroll);
        }
      }
      
      console.log(`✅ Generated ${savedPayrolls.length} payroll records`);
      
      return {
        success: true,
        count: savedPayrolls.length,
        payrolls: savedPayrolls
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error generating weekly payroll:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 🎯 Process cash advance deduction in payroll
 */
export const processCashAdvanceInPayroll = async (payrollId, employeeId) => {
  try {
    const payroll = await EnhancedPayroll.findById(payrollId);
    if (!payroll) {
      throw new Error('Payroll not found');
    }
    
    // Get outstanding cash advances
    const advances = await CashAdvance.getEmployeeOutstanding(employeeId);
    
    let totalDeducted = 0;
    
    for (const advance of advances) {
      const deductionAmount = Math.min(advance.remainingBalance, payroll.cashAdvanceDeduction);
      
      if (deductionAmount > 0) {
        // Add payment to cash advance
        await advance.addPayment(
          deductionAmount,
          payroll.payrollId,
          payroll._id,
          null, // System process
          `Deducted from payroll ${payroll.payrollId}`
        );
        
        totalDeducted += deductionAmount;
      }
    }
    
    return {
      success: true,
      totalDeducted,
      advancesProcessed: advances.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  calculateEmployeePayroll,
  calculateBulkPayroll,
  generateWeeklyPayroll,
  getAttendanceSummary,
  calculateBasicSalary,
  calculateOvertimePay,
  calculateGrossSalary,
  getMandatoryDeductions,
  getCashAdvanceDeduction,
  calculateTotalDeductions,
  calculateNetSalary,
  getEmployeeYTD,
  processCashAdvanceInPayroll,
  getNextSunday,
  getPreviousMonday,
  calculateWorkHours,
  determineAttendanceStatus
};
