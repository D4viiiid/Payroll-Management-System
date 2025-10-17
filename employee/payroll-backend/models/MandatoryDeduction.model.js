import mongoose from 'mongoose';

const MandatoryDeductionSchema = new mongoose.Schema({
  deductionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `DED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  deductionName: {
    type: String,
    required: true,
    enum: {
      values: ['SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding Tax', 'Other'],
      message: 'Deduction name must be SSS, PhilHealth, Pag-IBIG, Withholding Tax, or Other'
    },
    index: true
  },
  deductionType: {
    type: String,
    enum: {
      values: ['Percentage', 'Fixed'],
      message: 'Deduction type must be either Percentage or Fixed'
    },
    required: true
  },
  
  // 💰 Deduction Rates
  percentageRate: {
    type: Number,
    min: [0, 'Percentage rate cannot be negative'],
    max: [1, 'Percentage rate cannot exceed 100% (1.0)'],
    // Example: 0.0275 for 2.75%
    validate: {
      validator: function(v) {
        // If type is Percentage, percentageRate is required
        if (this.deductionType === 'Percentage') {
          return v !== null && v !== undefined;
        }
        return true;
      },
      message: 'Percentage rate is required for percentage-based deductions'
    }
  },
  fixedAmount: {
    type: Number,
    min: [0, 'Fixed amount cannot be negative'],
    validate: {
      validator: function(v) {
        // If type is Fixed, fixedAmount is required
        if (this.deductionType === 'Fixed') {
          return v !== null && v !== undefined && v > 0;
        }
        return true;
      },
      message: 'Fixed amount is required for fixed deductions'
    }
  },
  
  // 📅 Effective Date Management
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        // If endDate is provided, it must be after effectiveDate
        if (v) {
          return v > this.effectiveDate;
        }
        return true;
      },
      message: 'End date must be after effective date'
    }
  },
  
  // ✅ Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // 👥 Applicability Rules
  applicableTo: {
    type: String,
    enum: {
      values: ['All', 'Regular', 'On-Call', 'Administrative'],
      message: 'Applicable to must be All, Regular, On-Call, or Administrative'
    },
    default: 'All',
    index: true
  },
  
  // 💼 Salary Range (Optional - for bracket-based deductions like Tax)
  salaryRangeMin: {
    type: Number,
    min: [0, 'Minimum salary range cannot be negative'],
    default: 0
  },
  salaryRangeMax: {
    type: Number,
    validate: {
      validator: function(v) {
        // If max is provided, it must be greater than min
        if (v !== null && v !== undefined) {
          return v > this.salaryRangeMin;
        }
        return true;
      },
      message: 'Maximum salary range must be greater than minimum'
    }
  },
  
  // 📝 Description & Notes
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  
  // 📜 Historical Tracking
  previousRates: [{
    rate: Number,
    effectiveDate: Date,
    endDate: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 👤 Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true
});

// 📌 Indexes for better query performance
MandatoryDeductionSchema.index({ deductionName: 1, isActive: 1 });
MandatoryDeductionSchema.index({ effectiveDate: 1, endDate: 1 });
MandatoryDeductionSchema.index({ applicableTo: 1, isActive: 1 });

// 🔄 Pre-save middleware to track rate changes
MandatoryDeductionSchema.pre('save', function(next) {
  // If this is an update and rate has changed, save to history
  if (this.isModified('percentageRate') || this.isModified('fixedAmount')) {
    if (!this.isNew) {
      this.previousRates.push({
        rate: this.deductionType === 'Percentage' ? this.percentageRate : this.fixedAmount,
        effectiveDate: this.effectiveDate,
        endDate: new Date(),
        updatedAt: new Date()
      });
    }
  }
  next();
});

// 📊 Static method to get active deductions for employee type
MandatoryDeductionSchema.statics.getActiveDeductions = async function(employmentType, currentDate = new Date()) {
  return this.find({
    isActive: true,
    effectiveDate: { $lte: currentDate },
    $or: [
      { endDate: { $gte: currentDate } },
      { endDate: null }
    ],
    $or: [
      { applicableTo: 'All' },
      { applicableTo: employmentType }
    ]
  }).sort({ deductionName: 1 });
};

// 📊 Static method to calculate deduction amount
MandatoryDeductionSchema.statics.calculateDeductionAmount = function(deduction, grossSalary) {
  // Check if deduction is applicable to salary range
  if (deduction.salaryRangeMax && grossSalary > deduction.salaryRangeMax) {
    return 0;
  }
  if (grossSalary < deduction.salaryRangeMin) {
    return 0;
  }
  
  // Calculate based on type
  if (deduction.deductionType === 'Percentage') {
    return grossSalary * deduction.percentageRate;
  } else {
    return deduction.fixedAmount;
  }
};

// 📊 Instance method to check if deduction is currently effective
MandatoryDeductionSchema.methods.isCurrentlyEffective = function(date = new Date()) {
  if (!this.isActive) return false;
  
  if (date < this.effectiveDate) return false;
  
  if (this.endDate && date > this.endDate) return false;
  
  return true;
};

// 📊 Instance method to check if applicable to employee
MandatoryDeductionSchema.methods.isApplicableToEmployee = function(employee) {
  if (this.applicableTo === 'All') return true;
  
  return this.applicableTo === employee.employmentType;
};

// 📊 Instance method to calculate amount for employee
MandatoryDeductionSchema.methods.calculateAmount = function(grossSalary) {
  // Check salary range
  if (this.salaryRangeMax && grossSalary > this.salaryRangeMax) {
    return 0;
  }
  if (grossSalary < this.salaryRangeMin) {
    return 0;
  }
  
  // Calculate based on type
  if (this.deductionType === 'Percentage') {
    return Math.round(grossSalary * this.percentageRate * 100) / 100; // Round to 2 decimals
  } else {
    return this.fixedAmount;
  }
};

const MandatoryDeduction = mongoose.model('MandatoryDeduction', MandatoryDeductionSchema);

export default MandatoryDeduction;
