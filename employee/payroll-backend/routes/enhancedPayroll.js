import express from 'express';
import EnhancedPayroll from '../models/EnhancedPayroll.model.js';
import { 
  calculateEmployeePayroll, 
  calculateBulkPayroll, 
  generateWeeklyPayroll,
  processCashAdvanceInPayroll 
} from '../services/payrollCalculator.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/paginationHelper.js';
import { setCacheHeaders } from '../middleware/cacheMiddleware.js';

const router = express.Router();

/**
 * 📊 ENHANCED PAYROLL ROUTES
 * Comprehensive payroll management with all features
 */

// GET all payroll records (with pagination)
router.get('/', setCacheHeaders(300), async (req, res) => {
  try {
    const { status, startDate, endDate, employee } = req.query;
    
    // Parse pagination parameters
    const paginationParams = getPaginationParams(req.query);
    const { page, limit, skip, maxLimit } = paginationParams;
    const safeLimit = Math.min(limit, maxLimit);
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (employee) {
      query.employee = employee;
    }
    
    if (startDate && endDate) {
      query['payPeriod.endDate'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get total count
    const totalCount = await EnhancedPayroll.countDocuments(query);
    
    // Execute paginated query
    const payrolls = await EnhancedPayroll.find(query)
      .populate('employee', 'firstName lastName employeeId email employmentType')
      .populate('processedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ 'payPeriod.endDate': -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean()
      .exec();
    
    // Build paginated response
    const response = createPaginatedResponse(payrolls, totalCount, paginationParams);
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payroll records', 
      error: error.message 
    });
  }
});

// GET single payroll by ID
router.get('/:id', async (req, res) => {
  try {
    const payroll = await EnhancedPayroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email employmentType dailyRate hourlyRate overtimeRate')
      .populate('processedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll record not found' 
      });
    }
    
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch payroll record', 
      error: error.message 
    });
  }
});

// POST calculate payroll for single employee
router.post('/calculate/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const result = await calculateEmployeePayroll(
      employeeId,
      new Date(startDate),
      new Date(endDate)
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate payroll',
      error: error.message
    });
  }
});

// POST calculate payroll for all employees (bulk)
router.post('/calculate/bulk', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const result = await calculateBulkPayroll(
      new Date(startDate),
      new Date(endDate)
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate bulk payroll',
      error: error.message
    });
  }
});

// POST create new payroll record
router.post('/', async (req, res) => {
  try {
    const payroll = new EnhancedPayroll(req.body);
    const savedPayroll = await payroll.save();
    
    const populatedPayroll = await EnhancedPayroll.findById(savedPayroll._id)
      .populate('employee', 'firstName lastName employeeId email');
    
    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully',
      payroll: populatedPayroll
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create payroll record',
      error: error.message
    });
  }
});

// PUT update payroll status (Process, Approve, Pay)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, userId } = req.body;
    
    const payroll = await EnhancedPayroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    payroll.status = status;
    
    if (status === 'Processed') {
      payroll.processedBy = userId;
      payroll.processedDate = new Date();
    } else if (status === 'Approved') {
      payroll.approvedBy = userId;
      payroll.approvalDate = new Date();
    } else if (status === 'Paid') {
      payroll.paymentDate = new Date();
      
      // Process cash advance deductions
      const cashAdvanceResult = await processCashAdvanceInPayroll(
        payroll._id,
        payroll.employee
      );
      
      console.log('Cash advance processing result:', cashAdvanceResult);
    }
    
    await payroll.save();
    
    const updatedPayroll = await EnhancedPayroll.findById(payroll._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('processedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: `Payroll ${status.toLowerCase()} successfully`,
      payroll: updatedPayroll
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update payroll status',
      error: error.message
    });
  }
});

// PUT update payroll record
router.put('/:id', async (req, res) => {
  try {
    const updatedPayroll = await EnhancedPayroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId');
    
    if (!updatedPayroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payroll record updated successfully',
      payroll: updatedPayroll
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update payroll record',
      error: error.message
    });
  }
});

// DELETE payroll record
router.delete('/:id', async (req, res) => {
  try {
    const payroll = await EnhancedPayroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Only allow deletion of Draft payrolls
    if (payroll.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft payroll records can be deleted'
      });
    }
    
    await EnhancedPayroll.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Payroll record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete payroll record',
      error: error.message
    });
  }
});

// GET payroll summary for a period
router.get('/summary/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const summary = await EnhancedPayroll.getPayrollSummary(
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      success: true,
      summary: summary[0] || {
        totalEmployees: 0,
        totalGrossSalary: 0,
        totalDeductions: 0,
        totalNetSalary: 0,
        totalOvertimePay: 0,
        totalCashAdvance: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll summary',
      error: error.message
    });
  }
});

// GET employee YTD (Year-to-Date)
router.get('/ytd/:employeeId/:year', async (req, res) => {
  try {
    const { employeeId, year } = req.params;
    
    const ytdData = await EnhancedPayroll.getEmployeeYTD(employeeId, parseInt(year));
    
    res.json({
      success: true,
      ytd: ytdData[0] || {
        yearToDateGross: 0,
        yearToDateNet: 0,
        yearToDateDeductions: 0,
        totalWorkDays: 0,
        totalHalfDays: 0,
        totalOvertimeHours: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YTD data',
      error: error.message
    });
  }
});

// GET payslip data for a payroll
router.get('/:id/payslip', async (req, res) => {
  try {
    const payroll = await EnhancedPayroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email employmentType');
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    const payslipData = payroll.generatePayslipData();
    
    res.json({
      success: true,
      payslip: payslipData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip data',
      error: error.message
    });
  }
});

// 🆕 PHASE 2: Download payslip as PDF
router.get('/:id/payslip/download', async (req, res) => {
  try {
    console.log(`📄 Generating PDF payslip for payroll: ${req.params.id}`);
    
    const payroll = await EnhancedPayroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email employmentType dailyRate position department')
      .populate('mandatoryDeductions.deduction', 'name type rate');
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Import payslip generator dynamically
    const { generatePayslipPDF, getPayslipFilename } = await import('../services/payslipGenerator.js');
    
    // Generate PDF buffer
    const pdfBuffer = await generatePayslipPDF(req.params.id);
    
    // Generate filename
    const filename = getPayslipFilename(payroll.employee, payroll);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log(`✅ PDF generated: ${filename} (${pdfBuffer.length} bytes)`);
    
    // Send PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Error generating PDF payslip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF payslip',
      error: error.message
    });
  }
});

// POST generate weekly payroll (for cron job or manual trigger)
router.post('/generate/weekly', async (req, res) => {
  try {
    const result = await generateWeeklyPayroll();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly payroll',
      error: error.message
    });
  }
});

export default router;
