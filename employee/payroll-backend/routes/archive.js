/**
 * Archive Routes
 * API endpoints for archiving and restoring records
 */

import express from 'express';
import moment from 'moment-timezone';
import {
  archivePayrollRecords,
  archiveAttendanceRecords,
  restorePayrollRecords,
  restoreAttendanceRecords,
  getArchivedPayrolls,
  getArchivedAttendances,
  getArchiveStatistics
} from '../services/archiveService.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/paginationHelper.js';
import { setCacheHeaders } from '../middleware/cacheMiddleware.js';

const router = express.Router();
const TIMEZONE = 'Asia/Manila';

/**
 * POST /api/archive/payroll
 * Archive payroll records before a specific date
 * Body: { beforeDate, archivedBy }
 */
router.post('/payroll', async (req, res) => {
  try {
    const { beforeDate, archivedBy } = req.body;

    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: 'beforeDate is required'
      });
    }

    const date = moment.tz(beforeDate, TIMEZONE).toDate();
    const result = await archivePayrollRecords(date, archivedBy);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in archive payroll endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving payroll records',
      error: error.message
    });
  }
});

/**
 * POST /api/archive/attendance
 * Archive attendance records before a specific date
 * Body: { beforeDate, archivedBy }
 */
router.post('/attendance', async (req, res) => {
  try {
    const { beforeDate, archivedBy } = req.body;

    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: 'beforeDate is required'
      });
    }

    const date = moment.tz(beforeDate, TIMEZONE).toDate();
    const result = await archiveAttendanceRecords(date, archivedBy);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in archive attendance endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving attendance records',
      error: error.message
    });
  }
});

/**
 * POST /api/archive/restore/payroll
 * Restore archived payroll records
 * Body: { startDate, endDate }
 */
router.post('/restore/payroll', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const start = moment.tz(startDate, TIMEZONE).toDate();
    const end = moment.tz(endDate, TIMEZONE).toDate();

    const result = await restorePayrollRecords(start, end);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in restore payroll endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring payroll records',
      error: error.message
    });
  }
});

/**
 * POST /api/archive/restore/attendance
 * Restore archived attendance records
 * Body: { startDate, endDate }
 */
router.post('/restore/attendance', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const start = moment.tz(startDate, TIMEZONE).toDate();
    const end = moment.tz(endDate, TIMEZONE).toDate();

    const result = await restoreAttendanceRecords(start, end);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in restore attendance endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring attendance records',
      error: error.message
    });
  }
});

/**
 * GET /api/archive/payroll
 * Get archived payroll records
 * Query params: employeeId, startDate, endDate
 */
router.get('/payroll', async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const filter = {};

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (startDate && endDate) {
      filter.weekEnding = {
        $gte: moment.tz(startDate, TIMEZONE).toDate(),
        $lte: moment.tz(endDate, TIMEZONE).toDate()
      };
    }

    const result = await getArchivedPayrolls(filter);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in get archived payroll endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving archived payroll records',
      error: error.message
    });
  }
});

/**
 * GET /api/archive/attendance
 * Get archived attendance records
 * Query params: employeeId, startDate, endDate
 */
router.get('/attendance', async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const filter = {};

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: moment.tz(startDate, TIMEZONE).toDate(),
        $lte: moment.tz(endDate, TIMEZONE).toDate()
      };
    }

    const result = await getArchivedAttendances(filter);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in get archived attendance endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving archived attendance records',
      error: error.message
    });
  }
});

/**
 * GET /api/archive/statistics
 * Get archive statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = await getArchiveStatistics();

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in archive statistics endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving archive statistics',
      error: error.message
    });
  }
});

/**
 * POST /api/archive/bulk
 * Archive all records older than specified months
 * Body: { months, archivedBy }
 */
router.post('/bulk', async (req, res) => {
  try {
    const { months, archivedBy } = req.body;

    if (!months || isNaN(months)) {
      return res.status(400).json({
        success: false,
        message: 'Valid months parameter is required'
      });
    }

    const beforeDate = moment().tz(TIMEZONE).subtract(months, 'months').toDate();

    // Archive both payroll and attendance
    const [payrollResult, attendanceResult] = await Promise.all([
      archivePayrollRecords(beforeDate, archivedBy),
      archiveAttendanceRecords(beforeDate, archivedBy)
    ]);

    res.status(200).json({
      success: true,
      message: 'Bulk archive completed',
      payroll: payrollResult,
      attendance: attendanceResult,
      beforeDate: moment(beforeDate).tz(TIMEZONE).format('YYYY-MM-DD')
    });
  } catch (error) {
    console.error('Error in bulk archive endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk archive',
      error: error.message
    });
  }
});

export default router;
