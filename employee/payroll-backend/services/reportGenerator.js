/**
 * Report Generator Service
 * Generates comprehensive reports for payroll, attendance, employees, and cash advances
 */

import moment from 'moment-timezone';
import PDFDocument from 'pdfkit';
import Attendance from '../models/AttendanceModels.js';
import Employee from '../models/EmployeeModels.js';
import Payroll from '../models/Payroll.model.js';
import Deduction from '../models/Deduction.model.js';
import CashAdvance from '../models/CashAdvance.model.js';
import Salary from '../models/SalaryModel.js';

const TIMEZONE = 'Asia/Manila';

/**
 * Generate Weekly Payroll Report
 * @param {Date} startDate - Start of week
 * @param {Date} endDate - End of week (Sunday)
 * @returns {Object} Report data
 */
export const generateWeeklyPayrollReport = async (startDate, endDate) => {
  try {
    // Get all payroll records for the week
    const payrolls = await Payroll.find({
      weekEnding: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('employee');

    // Calculate totals
    let totalGrossSalary = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;
    let totalEmployees = payrolls.length;

    const employeeDetails = payrolls.map(payroll => {
      totalGrossSalary += payroll.grossSalary || 0;
      totalDeductions += payroll.totalDeductions || 0;
      totalNetSalary += payroll.netSalary || 0;

      return {
        employeeId: payroll.employee?.employeeId || 'N/A',
        name: `${payroll.employee?.firstName || ''} ${payroll.employee?.lastName || ''}`.trim(),
        position: payroll.employee?.employmentType || 'N/A',
        workDays: payroll.workDays || 0,
        halfDays: payroll.halfDays || 0,
        overtimeHours: payroll.overtimeHours || 0,
        grossSalary: payroll.grossSalary || 0,
        deductions: payroll.totalDeductions || 0,
        netSalary: payroll.netSalary || 0
      };
    });

    return {
      success: true,
      report: {
        reportType: 'Weekly Payroll Report',
        period: {
          start: moment(startDate).tz(TIMEZONE).format('YYYY-MM-DD'),
          end: moment(endDate).tz(TIMEZONE).format('YYYY-MM-DD')
        },
        summary: {
          totalEmployees,
          totalGrossSalary: parseFloat(totalGrossSalary.toFixed(2)),
          totalDeductions: parseFloat(totalDeductions.toFixed(2)),
          totalNetSalary: parseFloat(totalNetSalary.toFixed(2))
        },
        employees: employeeDetails,
        generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      }
    };
  } catch (error) {
    console.error('Error generating weekly payroll report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate Monthly Payroll Report
 * @param {Number} year - Year
 * @param {Number} month - Month (1-12)
 * @returns {Object} Report data
 */
export const generateMonthlyPayrollReport = async (year, month) => {
  try {
    const startDate = moment.tz(`${year}-${month}-01`, TIMEZONE).startOf('month').toDate();
    const endDate = moment.tz(`${year}-${month}-01`, TIMEZONE).endOf('month').toDate();

    // Get all payroll records for the month
    const payrolls = await Payroll.find({
      weekEnding: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('employee');

    // Group by employee to get monthly totals
    const employeeMap = {};

    payrolls.forEach(payroll => {
      const empId = payroll.employee?._id?.toString();
      if (!empId) return;

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employeeId: payroll.employee.employeeId,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          position: payroll.employee.employmentType,
          totalWorkDays: 0,
          totalHalfDays: 0,
          totalOvertimeHours: 0,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetSalary: 0,
          weeksCount: 0
        };
      }

      employeeMap[empId].totalWorkDays += payroll.workDays || 0;
      employeeMap[empId].totalHalfDays += payroll.halfDays || 0;
      employeeMap[empId].totalOvertimeHours += payroll.overtimeHours || 0;
      employeeMap[empId].totalGrossSalary += payroll.grossSalary || 0;
      employeeMap[empId].totalDeductions += payroll.totalDeductions || 0;
      employeeMap[empId].totalNetSalary += payroll.netSalary || 0;
      employeeMap[empId].weeksCount += 1;
    });

    const employeeDetails = Object.values(employeeMap);

    // Calculate grand totals
    const summary = employeeDetails.reduce((acc, emp) => ({
      totalEmployees: acc.totalEmployees + 1,
      totalGrossSalary: acc.totalGrossSalary + emp.totalGrossSalary,
      totalDeductions: acc.totalDeductions + emp.totalDeductions,
      totalNetSalary: acc.totalNetSalary + emp.totalNetSalary
    }), { totalEmployees: 0, totalGrossSalary: 0, totalDeductions: 0, totalNetSalary: 0 });

    return {
      success: true,
      report: {
        reportType: 'Monthly Payroll Report',
        period: {
          year,
          month,
          monthName: moment(`${year}-${month}`, 'YYYY-M').format('MMMM YYYY')
        },
        summary: {
          totalEmployees: summary.totalEmployees,
          totalGrossSalary: parseFloat(summary.totalGrossSalary.toFixed(2)),
          totalDeductions: parseFloat(summary.totalDeductions.toFixed(2)),
          totalNetSalary: parseFloat(summary.totalNetSalary.toFixed(2))
        },
        employees: employeeDetails,
        generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      }
    };
  } catch (error) {
    console.error('Error generating monthly payroll report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate Employee Report (YTD)
 * @param {String} employeeId - Employee ID
 * @param {Number} year - Year
 * @returns {Object} Report data
 */
export const generateEmployeeReport = async (employeeId, year) => {
  try {
    // Get employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return {
        success: false,
        error: 'Employee not found'
      };
    }

    const startDate = moment.tz(`${year}-01-01`, TIMEZONE).startOf('year').toDate();
    const endDate = moment.tz(`${year}-12-31`, TIMEZONE).endOf('year').toDate();

    // Get all payroll records for the year
    const payrolls = await Payroll.find({
      employee: employee._id,
      weekEnding: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ weekEnding: 1 });

    // Get attendance records
    const attendances = await Attendance.find({
      employee: employee._id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    // Calculate YTD totals
    let ytdGrossSalary = 0;
    let ytdDeductions = 0;
    let ytdNetSalary = 0;
    let ytdWorkDays = 0;
    let ytdHalfDays = 0;
    let ytdOvertimeHours = 0;

    payrolls.forEach(payroll => {
      ytdGrossSalary += payroll.grossSalary || 0;
      ytdDeductions += payroll.totalDeductions || 0;
      ytdNetSalary += payroll.netSalary || 0;
      ytdWorkDays += payroll.workDays || 0;
      ytdHalfDays += payroll.halfDays || 0;
      ytdOvertimeHours += payroll.overtimeHours || 0;
    });

    // Attendance summary
    const attendanceSummary = {
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      halfDay: attendances.filter(a => a.status === 'half-day').length,
      late: attendances.filter(a => a.status === 'late').length,
      absent: attendances.filter(a => a.status === 'absent').length
    };

    return {
      success: true,
      report: {
        reportType: 'Employee Year-to-Date Report',
        employee: {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          position: employee.employmentType,
          status: employee.status,
          hireDate: moment(employee.hireDate).format('YYYY-MM-DD')
        },
        year,
        ytdSummary: {
          totalGrossSalary: parseFloat(ytdGrossSalary.toFixed(2)),
          totalDeductions: parseFloat(ytdDeductions.toFixed(2)),
          totalNetSalary: parseFloat(ytdNetSalary.toFixed(2)),
          totalWorkDays: ytdWorkDays,
          totalHalfDays: ytdHalfDays,
          totalOvertimeHours: parseFloat(ytdOvertimeHours.toFixed(2))
        },
        attendanceSummary,
        payrollHistory: payrolls.map(p => ({
          weekEnding: moment(p.weekEnding).format('YYYY-MM-DD'),
          grossSalary: p.grossSalary,
          deductions: p.totalDeductions,
          netSalary: p.netSalary
        })),
        generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      }
    };
  } catch (error) {
    console.error('Error generating employee report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate Attendance Report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Report data
 */
export const generateAttendanceReport = async (startDate, endDate) => {
  try {
    const attendances = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('employee').sort({ date: -1 });

    // Group by employee
    const employeeMap = {};

    attendances.forEach(attendance => {
      const empId = attendance.employee?._id?.toString();
      if (!empId) return;

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employeeId: attendance.employee.employeeId,
          name: `${attendance.employee.firstName} ${attendance.employee.lastName}`,
          position: attendance.employee.employmentType,
          totalDays: 0,
          present: 0,
          halfDay: 0,
          late: 0,
          absent: 0,
          totalHoursWorked: 0,
          overtimeHours: 0
        };
      }

      employeeMap[empId].totalDays += 1;
      
      if (attendance.status === 'present') employeeMap[empId].present += 1;
      if (attendance.status === 'half-day') employeeMap[empId].halfDay += 1;
      if (attendance.status === 'late') employeeMap[empId].late += 1;
      if (attendance.status === 'absent') employeeMap[empId].absent += 1;

      if (attendance.actualHoursWorked) {
        employeeMap[empId].totalHoursWorked += attendance.actualHoursWorked;
      }
      if (attendance.overtimeHours) {
        employeeMap[empId].overtimeHours += attendance.overtimeHours;
      }
    });

    const employeeDetails = Object.values(employeeMap);

    // Calculate summary
    const summary = {
      totalEmployees: employeeDetails.length,
      totalRecords: attendances.length,
      totalPresent: employeeDetails.reduce((sum, emp) => sum + emp.present, 0),
      totalHalfDay: employeeDetails.reduce((sum, emp) => sum + emp.halfDay, 0),
      totalLate: employeeDetails.reduce((sum, emp) => sum + emp.late, 0),
      totalAbsent: employeeDetails.reduce((sum, emp) => sum + emp.absent, 0)
    };

    return {
      success: true,
      report: {
        reportType: 'Attendance Report',
        period: {
          start: moment(startDate).tz(TIMEZONE).format('YYYY-MM-DD'),
          end: moment(endDate).tz(TIMEZONE).format('YYYY-MM-DD')
        },
        summary,
        employees: employeeDetails,
        generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      }
    };
  } catch (error) {
    console.error('Error generating attendance report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate Cash Advance Report
 * @returns {Object} Report data
 */
export const generateCashAdvanceReport = async () => {
  try {
    const cashAdvances = await CashAdvance.find()
      .populate('employee')
      .populate('approvedBy')
      .sort({ requestDate: -1 });

    // Group by status
    const statusSummary = {
      pending: 0,
      approved: 0,
      rejected: 0,
      fullyPaid: 0,
      partiallyPaid: 0
    };

    let totalAmount = 0;
    let totalOutstanding = 0;

    const advanceDetails = cashAdvances.map(advance => {
      const status = advance.status.toLowerCase().replace(/\s+/g, '');
      if (statusSummary.hasOwnProperty(status)) {
        statusSummary[status] += 1;
      }

      totalAmount += advance.amount || 0;
      totalOutstanding += advance.remainingBalance || 0;

      return {
        advanceId: advance.advanceId,
        employeeId: advance.employee?.employeeId || 'N/A',
        employeeName: `${advance.employee?.firstName || ''} ${advance.employee?.lastName || ''}`.trim(),
        amount: advance.amount,
        requestDate: moment(advance.requestDate).format('YYYY-MM-DD'),
        approvedBy: advance.approvedBy ? `${advance.approvedBy.firstName} ${advance.approvedBy.lastName}` : 'N/A',
        status: advance.status,
        remainingBalance: advance.remainingBalance || 0,
        deductionAmount: advance.deductionAmount || 0
      };
    });

    return {
      success: true,
      report: {
        reportType: 'Cash Advance Report',
        summary: {
          totalAdvances: cashAdvances.length,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
          statusBreakdown: statusSummary
        },
        advances: advanceDetails,
        generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      }
    };
  } catch (error) {
    console.error('Error generating cash advance report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate Deductions Report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Report data
 */
export const generateDeductionsReport = async (startDate, endDate) => {
  try {
    const deductions = await Deduction.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('employee').sort({ createdAt: -1 });

    // Group by type
    const typeMap = {};
    let totalAmount = 0;

    deductions.forEach(deduction => {
      const type = deduction.type || 'Other';
      
      if (!typeMap[type]) {
        typeMap[type] = {
          type,
          count: 0,
          totalAmount: 0,
          employees: []
        };
      }

      typeMap[type].count += 1;
      typeMap[type].totalAmount += deduction.amount || 0;
      totalAmount += deduction.amount || 0;

      if (deduction.employee) {
        typeMap[type].employees.push({
          employeeId: deduction.employee.employeeId,
          name: `${deduction.employee.firstName} ${deduction.employee.lastName}`,
          amount: deduction.amount
        });
      }
    });

    const deductionsByType = Object.values(typeMap);

    return {
      success: true,
      report: {
        reportType: 'Deductions Report',
        period: {
          start: moment(startDate).tz(TIMEZONE).format('YYYY-MM-DD'),
          end: moment(endDate).tz(TIMEZONE).format('YYYY-MM-DD')
        },
        summary: {
          totalDeductions: deductions.length,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          typeBreakdown: deductionsByType.map(t => ({
            type: t.type,
            count: t.count,
            totalAmount: parseFloat(t.totalAmount.toFixed(2))
          }))
        },
        deductionsByType,
        generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      }
    };
  } catch (error) {
    console.error('Error generating deductions report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  generateWeeklyPayrollReport,
  generateMonthlyPayrollReport,
  generateEmployeeReport,
  generateAttendanceReport,
  generateCashAdvanceReport,
  generateDeductionsReport
};
