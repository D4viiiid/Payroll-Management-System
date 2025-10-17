import express from 'express';
import CashAdvance from '../models/CashAdvance.model.js';
import Employee from '../models/EmployeeModels.js';
import { validateNoSunday } from '../middleware/validateDates.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/paginationHelper.js';
import { setCacheHeaders } from '../middleware/cacheMiddleware.js';

const router = express.Router();

/**
 * 💰 CASH ADVANCE ROUTES
 * Complete cash advance management with approval workflow
 */

// GET all cash advances (with pagination)
router.get('/', setCacheHeaders(300), async (req, res) => {
  try {
    const { status, employee } = req.query;
    
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

    // Get total count
    const totalCount = await CashAdvance.countDocuments(query);
    
    // Execute paginated query with proper error handling for populate
    let advances;
    try {
      advances = await CashAdvance.find(query)
        .populate('employee', 'firstName lastName employeeId email employmentType status')
        
        
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec();
    } catch (populateError) {
      console.error('Error populating cash advances:', populateError);
      // If populate fails, return without populate
      advances = await CashAdvance.find(query)
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec();
    }
    
    // Build paginated response
    const response = createPaginatedResponse(advances, totalCount, paginationParams);
    
    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('❌ Error in GET /api/cash-advance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash advances',
      error: error.message
    });
  }
});

// GET pending approvals
router.get('/pending', async (req, res) => {
  try {
    const pendingAdvances = await CashAdvance.getPendingApprovals();
    
    res.json({
      success: true,
      count: pendingAdvances.length,
      advances: pendingAdvances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
});

// GET employee outstanding advances
router.get('/outstanding/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const outstanding = await CashAdvance.getEmployeeOutstanding(employeeId);
    const totalOutstanding = await CashAdvance.getTotalOutstanding(employeeId);
    
    res.json({
      success: true,
      totalOutstanding,
      count: outstanding.length,
      advances: outstanding
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch outstanding advances',
      error: error.message
    });
  }
});

// GET single cash advance by ID
router.get('/:id', async (req, res) => {
  try {
    const advance = await CashAdvance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email employmentType')
      
      
      ;
    
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }
    
    res.json({
      success: true,
      advance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash advance',
      error: error.message
    });
  }
});

// POST create new cash advance request
router.post('/', validateNoSunday, async (req, res) => {
  try {
    const { employee, amount, purpose, notes, requestDate } = req.body;
    
    // Additional Sunday validation for request date
    if (requestDate) {
      const date = new Date(requestDate);
      if (date.getDay() === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cash advances cannot be requested on Sunday. Work week is Monday-Saturday only.'
        });
      }
    }
    
    if (!employee || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Employee and amount are required'
      });
    }
    
    // Check if employee exists
    const employeeDoc = await Employee.findById(employee);
    if (!employeeDoc) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check if employee can request advance
    const canRequest = await CashAdvance.canRequestAdvance(employee, amount);
    
    if (!canRequest.canRequest) {
      return res.status(400).json({
        success: false,
        message: canRequest.reason,
        outstanding: canRequest.outstanding
      });
    }
    
    const advance = new CashAdvance({
      employee,
      amount,
      purpose,
      requestNotes: notes,
      requestDate: requestDate || new Date(),
      createdBy: employee
    });
    
    await advance.save();
    
    const populatedAdvance = await CashAdvance.findById(advance._id)
      .populate('employee', 'firstName lastName employeeId email');
    
    res.status(201).json({
      success: true,
      message: 'Cash advance request submitted successfully',
      advance: populatedAdvance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create cash advance request',
      error: error.message
    });
  }
});

// PUT approve cash advance
router.put('/:id/approve', async (req, res) => {
  try {
    const { approvedBy, notes, deductionSchedule } = req.body;
    
    const advance = await CashAdvance.findById(req.params.id);
    
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }
    
    if (advance.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve cash advance with status: ${advance.status}`
      });
    }
    
    await advance.approve(approvedBy, notes, deductionSchedule);
    
    const updatedAdvance = await CashAdvance.findById(advance._id)
      .populate('employee', 'firstName lastName employeeId')
      ;
    
    res.json({
      success: true,
      message: 'Cash advance approved successfully',
      advance: updatedAdvance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to approve cash advance',
      error: error.message
    });
  }
});

// PUT reject cash advance
router.put('/:id/reject', async (req, res) => {
  try {
    const { rejectedBy, reason } = req.body;
    
    const advance = await CashAdvance.findById(req.params.id);
    
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }
    
    if (advance.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject cash advance with status: ${advance.status}`
      });
    }
    
    await advance.reject(rejectedBy, reason);
    
    const updatedAdvance = await CashAdvance.findById(advance._id)
      .populate('employee', 'firstName lastName employeeId')
      ;
    
    res.json({
      success: true,
      message: 'Cash advance rejected',
      advance: updatedAdvance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to reject cash advance',
      error: error.message
    });
  }
});

// POST add payment to cash advance
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, payrollId, payrollRef, processedBy, notes } = req.body;
    
    const advance = await CashAdvance.findById(req.params.id);
    
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }
    
    await advance.addPayment(amount, payrollId, payrollRef, processedBy, notes);
    
    const updatedAdvance = await CashAdvance.findById(advance._id)
      .populate('employee', 'firstName lastName employeeId');
    
    res.json({
      success: true,
      message: 'Payment added successfully',
      advance: updatedAdvance,
      remainingBalance: updatedAdvance.remainingBalance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

// DELETE cancel cash advance (only pending)
router.delete('/:id', async (req, res) => {
  try {
    const { cancelledBy, reason } = req.body;
    
    const advance = await CashAdvance.findById(req.params.id);
    
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }
    
    await advance.cancel(cancelledBy, reason);
    
    res.json({
      success: true,
      message: 'Cash advance cancelled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

// GET payment summary for a cash advance
router.get('/:id/summary', async (req, res) => {
  try {
    const advance = await CashAdvance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId');
    
    if (!advance) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }
    
    const summary = advance.getPaymentSummary();
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payment summary',
      error: error.message
    });
  }
});

// GET check if employee can request advance
router.get('/check/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { amount } = req.query;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }
    
    const result = await CashAdvance.canRequestAdvance(employeeId, parseFloat(amount));
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check advance eligibility',
      error: error.message
    });
  }
});

export default router;
