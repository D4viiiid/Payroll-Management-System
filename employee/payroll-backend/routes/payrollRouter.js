import express from 'express';
import Payroll from '../models/Payroll.model.js';
import Employee from '../models/EmployeeModels.js';
import AttendanceModel from '../models/AttendanceModels.js';
import CashAdvance from '../models/CashAdvance.model.js';
import { validatePayroll } from '../middleware/validation.js';
import { validateNoSunday, validateDateRange } from '../middleware/validateDates.js';
import { calculateEmployeePayroll, getNextSunday, getPreviousMonday } from '../services/payrollCalculator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payroll
 *   description: Payroll management endpoints
 */

/**
 * @swagger
 * /api/payrolls:
 *   get:
 *     summary: Get all payroll management entries
 *     tags: [Payroll]
 *     responses:
 *       200:
 *         description: List of payroll management entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employeeName:
 *                     type: string
 *                   employeeId:
 *                     type: string
 *                   salary:
 *                     type: number
 *                   deductions:
 *                     type: number
 *                   netSalary:
 *                     type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    // ✅ FIX: Build query object with optional employeeId filter
    let query = { archived: { $ne: true } };
    
    // ✅ If employeeId is provided, add it to the query
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    // ✅ PERFORMANCE FIX: Optimized with lean() and field selection
    const payrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName employeeId email contactNumber status hireDate')
      .select('-__v') // Exclude version key
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for 5-10x faster queries
    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls:
 *   post:
 *     summary: Create a new payroll management entry
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeName
 *               - employeeId
 *               - salary
 *               - deductions
 *             properties:
 *               employeeName:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               salary:
 *                 type: number
 *               deductions:
 *                 type: number
 *     responses:
 *       201:
 *         description: Payroll management entry created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', validatePayroll, validateNoSunday, validateDateRange, async (req, res) => {
  try {
    const { employee, employeeName, employeeId, salary, deductions, cashAdvance, startDate, endDate, cutoffDate } = req.body;
    
    // Additional validation for payroll dates
    if (startDate) {
      const start = new Date(startDate);
      if (start.getDay() === 0) {
        return res.status(400).json({
          success: false,
          message: 'Payroll cannot start on Sunday. Work week starts on Monday.'
        });
      }
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (end.getDay() === 0) {
        return res.status(400).json({
          success: false,
          message: 'Payroll cannot end on Sunday. Work week ends on Saturday.'
        });
      }
    }
    
    if (cutoffDate) {
      const cutoff = new Date(cutoffDate);
      if (cutoff.getDay() !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Cutoff date must be Sunday.'
        });
      }
    }
    
    const cashAdvanceAmount = cashAdvance || 0;
    const netSalary = salary - (deductions || 0);
    
    const payroll = new Payroll({ 
      employee: employee || null, // Employee ObjectId reference
      employeeName, 
      employeeId, 
      salary, 
      cashAdvance: cashAdvanceAmount,
      deductions: deductions || cashAdvanceAmount, // deductions = cashAdvance for compatibility
      netSalary,
      startDate,
      endDate,
      cutoffDate,
      paymentStatus: 'Pending' // Default status
    });
    await payroll.save();
    res.status(201).json(payroll);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/archived:
 *   get:
 *     summary: Get all archived payroll records
 *     tags: [Payroll]
 *     responses:
 *       200:
 *         description: List of archived payroll records
 */
router.get('/archived', async (req, res) => {
  try {
    const archivedPayrolls = await Payroll.find({ archived: true })
      .populate('employee', 'firstName lastName employeeId email contactNumber status dailyRate hireDate')
      .sort({ createdAt: -1 });
    res.json(archivedPayrolls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/{id}/archive:
 *   put:
 *     summary: Archive a payroll record
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll archived successfully
 */
router.put('/:id/archive', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    res.json({ message: 'Payroll archived successfully', payroll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/{id}/restore:
 *   put:
 *     summary: Restore an archived payroll record
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll restored successfully
 */
router.put('/:id/restore', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { archived: false },
      { new: true }
    );
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    res.json({ message: 'Payroll restored successfully', payroll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/{id}:
 *   put:
 *     summary: Update a payroll management entry
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeName:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               salary:
 *                 type: number
 *               deductions:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payroll management entry updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payroll management entry not found
 */
router.put('/:id', validatePayroll, async (req, res) => {
  try {
    const { employeeName, employeeId, salary, deductions } = req.body;
    const netSalary = salary - deductions;
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { employeeName, employeeId, salary, deductions, netSalary },
      { new: true }
    );
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    res.json(payroll);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/{id}:
 *   delete:
 *     summary: Delete a payroll management entry
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll management entry deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payroll management entry not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    res.json({ message: 'Payroll deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/{id}/status:
 *   patch:
 *     summary: Update payroll payment status
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [Pending, Processing, Paid]
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    
    if (!['Pending', 'Processing', 'Paid'].includes(paymentStatus)) {
      return res.status(400).json({ 
        message: 'Invalid payment status. Must be: Pending, Processing, or Paid' 
      });
    }
    
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );
    
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll not found' });
    }
    
    res.json({ 
      message: 'Payment status updated successfully', 
      payroll 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/payrolls/calculate:
 *   post:
 *     summary: Calculate payroll based on attendance for an employee
 *     tags: [Payroll]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Employee ID (not MongoDB _id)
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Payroll calculated and created successfully
 */
router.post('/calculate', async (req, res) => {
  try {
    const { employeeId: empId, startDate, endDate } = req.body;
    
    // Find employee by employeeId (not _id)
    const employee = await Employee.findOne({ employeeId: empId });
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : getPreviousMonday(new Date());
    const end = endDate ? new Date(endDate) : getNextSunday(new Date());
    
    // Validate end date is Sunday
    if (end.getDay() !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Payroll cutoff must be on Sunday'
      });
    }
    
    // Calculate payroll using the payroll calculator
    const result = await calculateEmployeePayroll(employee._id, start, end);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    // Get cash advance for this employee
    const cashAdvance = await CashAdvance.getTotalOutstanding(employee._id);
    
    // Create payroll record
    const payroll = new Payroll({
      employee: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.employeeId,
      startDate: start,
      endDate: end,
      cutoffDate: end,
      salary: result.payroll.basicSalary + result.payroll.overtimePay,
      cashAdvance: cashAdvance,
      deductions: result.payroll.totalDeductions,
      netSalary: result.payroll.netSalary,
      paymentStatus: 'Pending'
    });
    
    await payroll.save();
    
    res.status(201).json({
      success: true,
      message: 'Payroll calculated and created successfully',
      payroll,
      calculation: result.summary
    });
  } catch (err) {
    console.error('Error calculating payroll:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

export default router;
