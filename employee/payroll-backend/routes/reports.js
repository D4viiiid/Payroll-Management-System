/**
 * Report Routes
 * API endpoints for generating various reports
 */

import express from 'express';
import moment from 'moment-timezone';
import {
  generateWeeklyPayrollReport,
  generateMonthlyPayrollReport,
  generateEmployeeReport,
  generateAttendanceReport,
  generateCashAdvanceReport,
  generateDeductionsReport
} from '../services/reportGenerator.js';

const router = express.Router();
const TIMEZONE = 'Asia/Manila';

/**
 * GET /api/reports/weekly-payroll
 * Generate weekly payroll report
 * Query params: startDate, endDate
 */
router.get('/weekly-payroll', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = moment.tz(startDate, TIMEZONE).startOf('day').toDate();
    const end = moment.tz(endDate, TIMEZONE).endOf('day').toDate();

    const result = await generateWeeklyPayrollReport(start, end);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in weekly payroll report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating weekly payroll report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/monthly-payroll
 * Generate monthly payroll report
 * Query params: year, month
 */
router.get('/monthly-payroll', async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month'
      });
    }

    const result = await generateMonthlyPayrollReport(yearNum, monthNum);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in monthly payroll report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating monthly payroll report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/employee/:employeeId
 * Generate employee YTD report
 * Query params: year
 */
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year is required'
      });
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year'
      });
    }

    const result = await generateEmployeeReport(employeeId, yearNum);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in employee report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating employee report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/attendance
 * Generate attendance report
 * Query params: startDate, endDate
 */
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = moment.tz(startDate, TIMEZONE).startOf('day').toDate();
    const end = moment.tz(endDate, TIMEZONE).endOf('day').toDate();

    const result = await generateAttendanceReport(start, end);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in attendance report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating attendance report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/cash-advance
 * Generate cash advance report
 */
router.get('/cash-advance', async (req, res) => {
  try {
    const result = await generateCashAdvanceReport();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in cash advance report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating cash advance report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/deductions
 * Generate deductions report
 * Query params: startDate, endDate
 */
router.get('/deductions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = moment.tz(startDate, TIMEZONE).startOf('day').toDate();
    const end = moment.tz(endDate, TIMEZONE).endOf('day').toDate();

    const result = await generateDeductionsReport(start, end);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in deductions report endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating deductions report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/summary
 * Get quick summary of all report types
 */
router.get('/summary', async (req, res) => {
  try {
    // Get current week dates
    const today = moment().tz(TIMEZONE);
    const startOfWeek = today.clone().startOf('week');
    const endOfWeek = today.clone().endOf('week');

    // Get current month
    const year = today.year();
    const month = today.month() + 1;

    // Generate quick summaries
    const [weeklyReport, monthlyReport, cashAdvanceReport] = await Promise.all([
      generateWeeklyPayrollReport(startOfWeek.toDate(), endOfWeek.toDate()),
      generateMonthlyPayrollReport(year, month),
      generateCashAdvanceReport()
    ]);

    res.status(200).json({
      success: true,
      summary: {
        currentWeek: weeklyReport.success ? weeklyReport.report.summary : null,
        currentMonth: monthlyReport.success ? monthlyReport.report.summary : null,
        cashAdvances: cashAdvanceReport.success ? cashAdvanceReport.report.summary : null
      },
      generatedAt: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    });
  } catch (error) {
    console.error('Error in reports summary endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating reports summary',
      error: error.message
    });
  }
});

export default router;
