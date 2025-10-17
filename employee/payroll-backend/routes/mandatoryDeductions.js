import express from 'express';
import MandatoryDeduction from '../models/MandatoryDeduction.model.js';

const router = express.Router();

/**
 * 📉 MANDATORY DEDUCTIONS ROUTES
 * Manage SSS, PhilHealth, Pag-IBIG, Tax, and other mandatory deductions
 */

// GET all mandatory deductions
router.get('/', async (req, res) => {
  try {
    const { isActive, applicableTo, deductionName } = req.query;
    
    let query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (applicableTo) {
      query.applicableTo = applicableTo;
    }
    
    if (deductionName) {
      query.deductionName = deductionName;
    }
    
    const deductions = await MandatoryDeduction.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .sort({ deductionName: 1, effectiveDate: -1 });
    
    res.json({
      success: true,
      deductions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mandatory deductions',
      error: error.message
    });
  }
});

// GET active deductions for employee type
router.get('/active/:employmentType', async (req, res) => {
  try {
    const { employmentType } = req.params;
    const currentDate = req.query.date ? new Date(req.query.date) : new Date();
    
    const deductions = await MandatoryDeduction.getActiveDeductions(employmentType, currentDate);
    
    res.json({
      success: true,
      count: deductions.length,
      deductions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active deductions',
      error: error.message
    });
  }
});

// GET single deduction by ID
router.get('/:id', async (req, res) => {
  try {
    const deduction = await MandatoryDeduction.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    res.json({
      success: true,
      deduction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deduction',
      error: error.message
    });
  }
});

// POST create new mandatory deduction
router.post('/', async (req, res) => {
  try {
    const deduction = new MandatoryDeduction(req.body);
    await deduction.save();
    
    const populatedDeduction = await MandatoryDeduction.findById(deduction._id)
      .populate('createdBy', 'firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'Mandatory deduction created successfully',
      deduction: populatedDeduction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create mandatory deduction',
      error: error.message
    });
  }
});

// PUT update mandatory deduction
router.put('/:id', async (req, res) => {
  try {
    const deduction = await MandatoryDeduction.findById(req.params.id);
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'deductionId') {
        deduction[key] = req.body[key];
      }
    });
    
    await deduction.save();
    
    const updatedDeduction = await MandatoryDeduction.findById(deduction._id)
      .populate('lastUpdatedBy', 'firstName lastName');
    
    res.json({
      success: true,
      message: 'Mandatory deduction updated successfully',
      deduction: updatedDeduction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update mandatory deduction',
      error: error.message
    });
  }
});

// PATCH toggle deduction active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const deduction = await MandatoryDeduction.findById(req.params.id);
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    deduction.isActive = !deduction.isActive;
    
    if (req.body.lastUpdatedBy) {
      deduction.lastUpdatedBy = req.body.lastUpdatedBy;
    }
    
    await deduction.save();
    
    res.json({
      success: true,
      message: `Deduction ${deduction.isActive ? 'activated' : 'deactivated'} successfully`,
      deduction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to toggle deduction status',
      error: error.message
    });
  }
});

// DELETE mandatory deduction
router.delete('/:id', async (req, res) => {
  try {
    const deduction = await MandatoryDeduction.findByIdAndDelete(req.params.id);
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Mandatory deduction deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete mandatory deduction',
      error: error.message
    });
  }
});

// POST calculate deduction amount for gross salary
router.post('/calculate', async (req, res) => {
  try {
    const { deductionId, grossSalary } = req.body;
    
    if (!deductionId || grossSalary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Deduction ID and gross salary are required'
      });
    }
    
    const deduction = await MandatoryDeduction.findById(deductionId);
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    const amount = MandatoryDeduction.calculateDeductionAmount(deduction, grossSalary);
    
    res.json({
      success: true,
      deductionName: deduction.deductionName,
      deductionType: deduction.deductionType,
      grossSalary,
      amount,
      rate: deduction.deductionType === 'Percentage' ? deduction.percentageRate : deduction.fixedAmount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate deduction amount',
      error: error.message
    });
  }
});

// GET deduction history (previous rates)
router.get('/:id/history', async (req, res) => {
  try {
    const deduction = await MandatoryDeduction.findById(req.params.id)
      .populate('previousRates.updatedBy', 'firstName lastName');
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    res.json({
      success: true,
      deductionName: deduction.deductionName,
      currentRate: {
        type: deduction.deductionType,
        rate: deduction.deductionType === 'Percentage' ? deduction.percentageRate : deduction.fixedAmount,
        effectiveDate: deduction.effectiveDate
      },
      history: deduction.previousRates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deduction history',
      error: error.message
    });
  }
});

// GET check if deduction is currently effective
router.get('/:id/check-effective', async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = date ? new Date(date) : new Date();
    
    const deduction = await MandatoryDeduction.findById(req.params.id);
    
    if (!deduction) {
      return res.status(404).json({
        success: false,
        message: 'Deduction not found'
      });
    }
    
    const isEffective = deduction.isCurrentlyEffective(checkDate);
    
    res.json({
      success: true,
      deductionName: deduction.deductionName,
      isEffective,
      checkDate,
      effectiveDate: deduction.effectiveDate,
      endDate: deduction.endDate,
      isActive: deduction.isActive
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check deduction effectiveness',
      error: error.message
    });
  }
});

// POST seed default mandatory deductions (SSS, PhilHealth, Pag-IBIG, Tax)
router.post('/seed/defaults', async (req, res) => {
  try {
    const defaultDeductions = [
      {
        deductionName: 'SSS',
        deductionType: 'Percentage',
        percentageRate: 0.045, // 4.5%
        effectiveDate: new Date(),
        isActive: true,
        applicableTo: 'All',
        description: 'Social Security System contribution (4.5% of gross salary)'
      },
      {
        deductionName: 'PhilHealth',
        deductionType: 'Percentage',
        percentageRate: 0.04, // 4%
        effectiveDate: new Date(),
        isActive: true,
        applicableTo: 'All',
        description: 'Philippine Health Insurance Corporation contribution (4% of gross salary)'
      },
      {
        deductionName: 'Pag-IBIG',
        deductionType: 'Percentage',
        percentageRate: 0.02, // 2%
        effectiveDate: new Date(),
        isActive: true,
        applicableTo: 'All',
        description: 'Home Development Mutual Fund contribution (2% of gross salary)'
      },
      {
        deductionName: 'Withholding Tax',
        deductionType: 'Percentage',
        percentageRate: 0.15, // 15% (simplified - should use tax brackets)
        effectiveDate: new Date(),
        isActive: true,
        applicableTo: 'All',
        salaryRangeMin: 5000,
        description: 'Withholding tax (15% for demo purposes - adjust based on tax brackets)'
      }
    ];
    
    const created = [];
    const skipped = [];
    
    for (const deductionData of defaultDeductions) {
      const existing = await MandatoryDeduction.findOne({ deductionName: deductionData.deductionName });
      
      if (!existing) {
        const deduction = new MandatoryDeduction(deductionData);
        await deduction.save();
        created.push(deduction);
      } else {
        skipped.push(deductionData.deductionName);
      }
    }
    
    res.json({
      success: true,
      message: 'Default deductions seeding completed',
      created: created.length,
      skipped: skipped.length,
      deductions: created,
      skippedNames: skipped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to seed default deductions',
      error: error.message
    });
  }
});

export default router;
