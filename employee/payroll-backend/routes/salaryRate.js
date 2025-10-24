import express from 'express';
import SalaryRate from '../models/SalaryRate.model.js';
import { auth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * 💰 SALARY RATE MANAGEMENT ROUTES
 * Manage global salary rates with historical tracking
 */

// GET current active rate (no auth required - used by all pages)
router.get('/current', async (req, res) => {
  try {
    // ✅ PERFORMANCE FIX: Use lean() for faster query
    const rate = await SalaryRate.findOne({ isActive: true })
      .select('dailyRate hourlyRate overtimeRate effectiveDate isActive')
      .lean()
      .exec();
    
    if (!rate) {
      // Return default rates if no rate found
      return res.json({
        success: true,
        rate: {
          dailyRate: 550,
          hourlyRate: 68.75,
          overtimeRate: 85.94,
          maxCashAdvance: 1100,
          effectiveDate: new Date(),
          isActive: true
        }
      });
    }
    
    // ✅ FIX ISSUE #3: Include maxCashAdvance (2× dailyRate) in response
    res.json({
      success: true,
      rate: {
        _id: rate._id,
        dailyRate: rate.dailyRate,
        hourlyRate: rate.hourlyRate,
        overtimeRate: rate.overtimeRate,
        maxCashAdvance: rate.dailyRate * 2, // Calculate max cash advance (2× daily rate)
        effectiveDate: rate.effectiveDate,
        isActive: rate.isActive
      }
    });
  } catch (error) {
    console.error('❌ Error fetching current rate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current rate',
      error: error.message
    });
  }
});

// GET rate history (public - no auth required for read-only access)
// ✅ CRITICAL FIX ISSUE #2: Remove authentication requirement from history endpoint
// Rate history is read-only information useful for context when viewing salary data
// Only CREATION of new rates requires authentication
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await SalaryRate.getRateHistory(limit);
    
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('❌ Error fetching rate history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rate history',
      error: error.message
    });
  }
});

// GET rate for specific date
router.get('/for-date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    const rate = await SalaryRate.getRateForDate(date);
    
    res.json({
      success: true,
      rate: {
        dailyRate: rate.dailyRate,
        hourlyRate: rate.hourlyRate,
        overtimeRate: rate.overtimeRate,
        effectiveDate: rate.effectiveDate
      }
    });
  } catch (error) {
    console.error('❌ Error fetching rate for date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rate for date',
      error: error.message
    });
  }
});

// POST create new rate (admin only)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { dailyRate, effectiveDate, reason, notes, createdBy, createdByName } = req.body;
    
    // Validation
    if (!dailyRate || dailyRate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid daily rate is required (must be greater than 0)'
      });
    }
    
    if (!createdBy || !createdByName) {
      return res.status(400).json({
        success: false,
        message: 'Creator information is required'
      });
    }
    
    // Create new rate
    const rate = new SalaryRate({
      dailyRate: parseFloat(dailyRate),
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      createdBy,
      createdByName,
      reason: reason || 'Rate adjustment',
      notes: notes || '',
      isActive: true
    });
    
    // Pre-save hooks will:
    // 1. Calculate hourlyRate and overtimeRate from dailyRate
    // 2. Deactivate all other rates
    await rate.save();
    
    // Fetch populated version
    const populatedRate = await SalaryRate.findById(rate._id)
      .populate('createdBy', 'firstName lastName employeeId')
      .lean();
    
    console.log(`✅ New salary rate created: ₱${rate.dailyRate} daily (₱${rate.hourlyRate}/hr, ₱${rate.overtimeRate}/hr OT)`);
    
    res.status(201).json({
      success: true,
      message: 'Salary rate updated successfully',
      rate: populatedRate
    });
  } catch (error) {
    console.error('❌ Error creating salary rate:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create salary rate',
      error: error.message
    });
  }
});

export default router;
