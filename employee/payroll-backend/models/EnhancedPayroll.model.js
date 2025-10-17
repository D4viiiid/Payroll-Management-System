import mongoose from 'mongoose';

const EnhancedPayrollSchema = new mongoose.Schema({
  payrollId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  
  // 📅 Pay Period (Weekly with Sunday Cutoff)
  payPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          // Ensure endDate is a Sunday (day 0)
          return v.getDay() === 0;
        },
        message: 'Payroll cutoff must be on Sunday'
      }
    }
  },
  
  // 📊 Attendance Summary
  workDays: {
    type: Number,
    default: 0,
    min: [0, 'Work days cannot be negative']
  },
  halfDays: {
    type: Number,
    default: 0,
    min: [0, 'Half days cannot be negative']
  },
  totalHoursWorked: {
    type: Number,
    default: 0,
    min: [0, 'Total hours cannot be negative']
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: [0, 'Overtime hours cannot be negative']
  },
  
  // 💰 Earnings Breakdown
  basicSalary: {
    type: Number,
    required: true,
    min: [0, 'Basic salary cannot be negative'],
    // Formula: (fullDays * dailyRate) + (halfDays * dailyRate / 2)
  },
  overtimePay: {
    type: Number,
    default: 0,
    min: [0, 'Overtime pay cannot be negative'],
    // Formula: overtimeHours * overtimeRate
  },
  grossSalary: {
    type: Number,
    required: true,
    min: [0, 'Gross salary cannot be negative'],
    // Formula: basicSalary + overtimePay
  },
  
  // 📉 Deductions Breakdown
  mandatoryDeductions: [{
    deductionName: {
      type: String,
      required: true,
      enum: ['SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding Tax', 'Other']
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Deduction amount cannot be negative']
    },
    percentageRate: {
      type: Number,
      min: 0,
      max: 1 // 0 to 1 (0% to 100%)
    },
    calculationType: {
      type: String,
      enum: ['Fixed', 'Percentage'],
      default: 'Fixed'
    }
  }],
  cashAdvanceDeduction: {
    type: Number,
    default: 0,
    min: [0, 'Cash advance deduction cannot be negative'],
    max: [1100, 'Cash advance deduction cannot exceed ₱1,100']
  },
  otherDeductions: {
    type: Number,
    default: 0,
    min: [0, 'Other deductions cannot be negative']
  },
  totalDeductions: {
    type: Number,
    required: true,
    min: [0, 'Total deductions cannot be negative']
  },
  
  // 💵 Net Pay
  netSalary: {
    type: Number,
    required: true,
    // Formula: grossSalary - totalDeductions
  },
  
  // 📈 Year-to-Date Tracking
  yearToDate: {
    type: Number,
    default: 0,
    min: [0, 'Year-to-date cannot be negative']
  },
  
  // 🔄 Status & Workflow
  status: {
    type: String,
    enum: ['Draft', 'Processed', 'Approved', 'Paid', 'Archived'],
    default: 'Draft',
    index: true
  },
  
  // 👤 Tracking Information
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  processedDate: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvalDate: {
    type: Date
  },
  paymentDate: {
    type: Date
  },
  
  // 📝 Additional Information
  remarks: {
    type: String,
    trim: true
  },
  payslipGenerated: {
    type: Boolean,
    default: false
  },
  payslipUrl: {
    type: String
  }
}, {
  timestamps: true
});

// 📌 Indexes for better query performance
EnhancedPayrollSchema.index({ employee: 1, 'payPeriod.startDate': 1, 'payPeriod.endDate': 1 });
EnhancedPayrollSchema.index({ status: 1, 'payPeriod.endDate': -1 });
// payrollId already has unique: true in schema definition above

// 🔄 Pre-save middleware to calculate totals
EnhancedPayrollSchema.pre('save', function(next) {
  // Calculate gross salary
  this.grossSalary = this.basicSalary + this.overtimePay;
  
  // Calculate total deductions
  const mandatoryTotal = this.mandatoryDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  this.totalDeductions = mandatoryTotal + this.cashAdvanceDeduction + this.otherDeductions;
  
  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions;
  
  // Ensure net salary is not negative
  if (this.netSalary < 0) {
    this.netSalary = 0;
  }
  
  next();
});

// 📊 Static method to get payroll summary for a period
EnhancedPayrollSchema.statics.getPayrollSummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'payPeriod.startDate': { $gte: startDate },
        'payPeriod.endDate': { $lte: endDate },
        status: { $in: ['Processed', 'Approved', 'Paid'] }
      }
    },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        totalGrossSalary: { $sum: '$grossSalary' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNetSalary: { $sum: '$netSalary' },
        totalOvertimePay: { $sum: '$overtimePay' },
        totalCashAdvance: { $sum: '$cashAdvanceDeduction' }
      }
    }
  ]);
};

// 📊 Static method to get employee YTD
EnhancedPayrollSchema.statics.getEmployeeYTD = async function(employeeId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  return this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        'payPeriod.endDate': { $gte: startOfYear, $lte: endOfYear },
        status: { $in: ['Processed', 'Approved', 'Paid'] }
      }
    },
    {
      $group: {
        _id: null,
        yearToDateGross: { $sum: '$grossSalary' },
        yearToDateNet: { $sum: '$netSalary' },
        yearToDateDeductions: { $sum: '$totalDeductions' },
        totalWorkDays: { $sum: '$workDays' },
        totalHalfDays: { $sum: '$halfDays' },
        totalOvertimeHours: { $sum: '$overtimeHours' }
      }
    }
  ]);
};

// 📊 Instance method to generate payslip data
EnhancedPayrollSchema.methods.generatePayslipData = function() {
  return {
    payrollId: this.payrollId,
    employee: this.employee,
    payPeriod: this.payPeriod,
    attendance: {
      workDays: this.workDays,
      halfDays: this.halfDays,
      totalHoursWorked: this.totalHoursWorked,
      overtimeHours: this.overtimeHours
    },
    earnings: {
      basicSalary: this.basicSalary,
      overtimePay: this.overtimePay,
      grossSalary: this.grossSalary
    },
    deductions: {
      mandatory: this.mandatoryDeductions,
      cashAdvance: this.cashAdvanceDeduction,
      other: this.otherDeductions,
      total: this.totalDeductions
    },
    netSalary: this.netSalary,
    yearToDate: this.yearToDate,
    paymentDate: this.paymentDate,
    remarks: this.remarks
  };
};

const EnhancedPayroll = mongoose.model('EnhancedPayroll', EnhancedPayrollSchema);

export default EnhancedPayroll;
