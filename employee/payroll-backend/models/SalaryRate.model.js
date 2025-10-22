import mongoose from 'mongoose';

const salaryRateSchema = new mongoose.Schema({
  // Rate Configuration
  dailyRate: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Daily rate must be greater than 0'
    }
  },
  
  // Calculated rates (stored but auto-computed from dailyRate)
  hourlyRate: {
    type: Number,
    required: false // Auto-calculated in pre-save hook
  },
  
  overtimeRate: {
    type: Number,
    required: false // Auto-calculated in pre-save hook
  },
  
  // Metadata
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true // Index for efficient queries
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  
  createdByName: {
    type: String,
    required: true
  },
  
  reason: {
    type: String,
    default: 'Rate adjustment'
  },
  
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// ✅ CRITICAL PERFORMANCE FIX: Comprehensive indexes
salaryRateSchema.index({ isActive: 1, effectiveDate: -1 }); // Primary active rate query
salaryRateSchema.index({ effectiveDate: -1 }); // Historical lookups
salaryRateSchema.index({ createdBy: 1, effectiveDate: -1 }); // Audit trail queries
salaryRateSchema.index({ isActive: 1 }); // Quick active check

// ===== VIRTUAL FIELDS =====

// ✅ FIX ISSUE #2: Add maxCashAdvance virtual field
// Maximum cash advance = 2 × daily rate
salaryRateSchema.virtual('maxCashAdvance').get(function() {
  return this.dailyRate * 2;
});

// Ensure virtuals are included in JSON output
salaryRateSchema.set('toJSON', { virtuals: true });
salaryRateSchema.set('toObject', { virtuals: true });

// ===== STATIC METHODS =====

// Get current active rate
salaryRateSchema.statics.getCurrentRate = async function() {
  const rate = await this.findOne({ isActive: true })
    .sort({ effectiveDate: -1 })
    .lean();
  
  if (!rate) {
    // Return default rate if none exists
    console.warn('⚠️ No active salary rate found, returning default rate');
    return {
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94,
      effectiveDate: new Date(),
      isActive: true
    };
  }
  
  return rate;
};

// Get rate for specific date (for historical payroll calculations)
salaryRateSchema.statics.getRateForDate = async function(date) {
  const rate = await this.findOne({
    effectiveDate: { $lte: date }
  })
  .sort({ effectiveDate: -1 })
  .lean();
  
  if (!rate) {
    console.warn('⚠️ No rate found for date:', date, '- returning default');
    return {
      dailyRate: 550,
      hourlyRate: 68.75,
      overtimeRate: 85.94,
      effectiveDate: date
    };
  }
  
  return rate;
};

// Get rate history
salaryRateSchema.statics.getRateHistory = async function(limit = 10) {
  return this.find()
    .sort({ effectiveDate: -1 })
    .limit(limit)
    .populate('createdBy', 'firstName lastName employeeId')
    .lean();
};

// ===== INSTANCE METHODS =====

// Deactivate all other rates when this rate becomes active
salaryRateSchema.methods.deactivatePrevious = async function() {
  await this.constructor.updateMany(
    { _id: { $ne: this._id } },
    { $set: { isActive: false } }
  );
};

// ===== PRE-SAVE HOOKS =====

// Auto-calculate hourly and overtime rates before saving
salaryRateSchema.pre('save', function(next) {
  // Calculate rates from dailyRate
  this.hourlyRate = this.dailyRate / 8;
  this.overtimeRate = this.hourlyRate * 1.25;
  next();
});

// Deactivate other active rates before saving new active rate
salaryRateSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    await this.deactivatePrevious();
  }
  next();
});

const SalaryRate = mongoose.model('SalaryRate', salaryRateSchema);

export default SalaryRate;
