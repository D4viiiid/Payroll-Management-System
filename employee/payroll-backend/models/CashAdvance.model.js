import mongoose from 'mongoose';

const CashAdvanceSchema = new mongoose.Schema({
  advanceId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `CA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  
  // 💰 Amount Details
  amount: {
    type: Number,
    required: true,
    min: [1, 'Cash advance amount must be at least ₱1'],
    max: [1100, 'Cash advance amount cannot exceed ₱1,100 (2 days salary)'],
    validate: {
      validator: function(v) {
        return v > 0 && v <= 1100;
      },
      message: 'Cash advance must be between ₱1 and ₱1,100'
    }
  },
  remainingBalance: {
    type: Number,
    required: true,
    default: function() {
      return this.amount;
    },
    min: [0, 'Remaining balance cannot be negative']
  },
  
  // 📅 Dates
  requestDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  approvalDate: {
    type: Date
  },
  rejectionDate: {
    type: Date
  },
  fullyPaidDate: {
    type: Date
  },
  
  // 🔄 Status & Workflow
  status: {
    type: String,
    enum: {
      values: ['Pending', 'Approved', 'Rejected', 'Partially Paid', 'Fully Paid', 'Cancelled'],
      message: 'Invalid status'
    },
    default: 'Pending',
    required: true,
    index: true
  },
  
  // 👤 Approval Management
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvalNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // 💳 Deduction Management
  deductionAmount: {
    type: Number,
    default: 0,
    min: [0, 'Deduction amount cannot be negative'],
    validate: {
      validator: function(v) {
        return v <= this.amount;
      },
      message: 'Deduction amount cannot exceed advance amount'
    }
  },
  deductionSchedule: {
    type: Date,
    validate: {
      validator: function(v) {
        // If status is Approved, deduction schedule should be set
        if (this.status === 'Approved' && !v) {
          return false;
        }
        return true;
      },
      message: 'Deduction schedule is required for approved advances'
    }
  },
  
  // 💸 Payment History
  paymentHistory: [{
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount cannot be negative']
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    payrollId: {
      type: String
    },
    payrollRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EnhancedPayroll'
    },
    balanceAfterPayment: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      trim: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  }],
  
  // 📝 Additional Information
  purpose: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  requestNotes: {
    type: String,
    trim: true
  },
  
  // 📊 Tracking
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
CashAdvanceSchema.index({ employee: 1, status: 1 });
CashAdvanceSchema.index({ status: 1, requestDate: -1 });
CashAdvanceSchema.index({ 'paymentHistory.payrollId': 1 });

// 🔄 Pre-save middleware to update status based on balance
CashAdvanceSchema.pre('save', function(next) {
  // Update status based on remaining balance
  if (this.status === 'Approved' || this.status === 'Partially Paid') {
    if (this.remainingBalance === 0) {
      this.status = 'Fully Paid';
      this.fullyPaidDate = new Date();
    } else if (this.remainingBalance < this.amount) {
      this.status = 'Partially Paid';
    }
  }
  
  // Calculate total deduction amount from payment history
  const totalPaid = this.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  this.deductionAmount = totalPaid;
  this.remainingBalance = this.amount - totalPaid;
  
  next();
});

// 📊 Static method to get pending approvals
CashAdvanceSchema.statics.getPendingApprovals = async function() {
  return this.find({ status: 'Pending' })
    .populate('employee', 'firstName lastName employeeId email')
    .sort({ requestDate: 1 });
};

// 📊 Static method to get employee outstanding advances
CashAdvanceSchema.statics.getEmployeeOutstanding = async function(employeeId) {
  return this.find({
    employee: employeeId,
    status: { $in: ['Approved', 'Partially Paid'] },
    remainingBalance: { $gt: 0 }
  }).sort({ requestDate: 1 });
};

// 📊 Static method to get total outstanding for employee
CashAdvanceSchema.statics.getTotalOutstanding = async function(employeeId) {
  const advances = await this.find({
    employee: employeeId,
    status: { $in: ['Approved', 'Partially Paid'] },
    remainingBalance: { $gt: 0 }
  });
  
  return advances.reduce((sum, advance) => sum + advance.remainingBalance, 0);
};

// 📊 Static method to check if employee can request advance
CashAdvanceSchema.statics.canRequestAdvance = async function(employeeId, requestAmount) {
  const Employee = mongoose.model('Employee');
  const Attendance = mongoose.model('Attendance');
  
  // Get employee details
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return {
      canRequest: false,
      reason: 'Employee not found',
      outstanding: 0
    };
  }
  
  // Get total outstanding
  const totalOutstanding = await this.getTotalOutstanding(employeeId);
  
  // Check if new advance + outstanding exceeds limit
  if (totalOutstanding + requestAmount > 1100) {
    return {
      canRequest: false,
      reason: `Total outstanding advances (₱${totalOutstanding}) + new request (₱${requestAmount}) exceeds maximum limit of ₱1,100`,
      outstanding: totalOutstanding
    };
  }
  
  // Check if has pending approval
  const pendingCount = await this.countDocuments({
    employee: employeeId,
    status: 'Pending'
  });
  
  if (pendingCount > 0) {
    return {
      canRequest: false,
      reason: 'You have a pending cash advance request awaiting approval',
      outstanding: totalOutstanding
    };
  }
  
  // NEW: Check work eligibility for amounts ≥ ₱1100
  if (requestAmount >= 1100) {
    // Calculate current week range (Monday - Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate Monday of current week
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Calculate Saturday of current week
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    saturday.setHours(23, 59, 59, 999);

    // Get attendance records for current week
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: monday, $lte: saturday },
      status: { $in: ['Present', 'present'] }
    });

    // Calculate total earnings from attendance
    const dailyRate = employee.dailyRate || 550;
    const hourlyRate = employee.hourlyRate || 68.75;
    const overtimeRate = employee.overtimeRate || 85.94;

    let totalEarnings = 0;
    attendanceRecords.forEach(record => {
      // Skip Sunday records
      const recordDate = new Date(record.date);
      if (recordDate.getDay() === 0) return;

      if (record.hoursWorked) {
        const regularHours = Math.min(record.hoursWorked, 8);
        const overtimeHours = Math.max(record.hoursWorked - 8, 0);
        totalEarnings += (regularHours * hourlyRate) + (overtimeHours * overtimeRate);
      } else if (record.status === 'Present' || record.status === 'present' || record.timeIn) {
        totalEarnings += dailyRate;
      }
    });

    // Check if earnings meet the requirement
    // For ₱1100, need at least 2 full pay days (₱1100)
    const requiredEarnings = requestAmount;
    
    if (totalEarnings < requiredEarnings) {
      const daysWorked = attendanceRecords.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getDay() !== 0; // Exclude Sundays
      }).length;
      
      const requiredDays = Math.ceil(requiredEarnings / dailyRate);
      
      return {
        canRequest: false,
        reason: `Insufficient work days. To request ₱${requestAmount}, you need at least ${requiredDays} full pay days (₱${requiredEarnings}+). Current earnings: ₱${totalEarnings.toFixed(2)} from ${daysWorked} days.`,
        outstanding: totalOutstanding,
        currentEarnings: totalEarnings,
        requiredEarnings: requiredEarnings,
        daysWorked: daysWorked,
        requiredDays: requiredDays
      };
    }
  }
  
  return {
    canRequest: true,
    outstanding: totalOutstanding
  };
};

// 📊 Instance method to approve advance
CashAdvanceSchema.methods.approve = function(approvedBy, notes, deductionSchedule) {
  this.status = 'Approved';
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  this.approvalNotes = notes;
  this.deductionSchedule = deductionSchedule;
  return this.save();
};

// 📊 Instance method to reject advance
CashAdvanceSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'Rejected';
  this.rejectedBy = rejectedBy;
  this.rejectionDate = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// 📊 Instance method to add payment
CashAdvanceSchema.methods.addPayment = function(amount, payrollId, payrollRef, processedBy, notes) {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }
  
  if (amount > this.remainingBalance) {
    throw new Error('Payment amount cannot exceed remaining balance');
  }
  
  const newBalance = this.remainingBalance - amount;
  
  this.paymentHistory.push({
    amount,
    date: new Date(),
    payrollId,
    payrollRef,
    balanceAfterPayment: newBalance,
    notes,
    processedBy
  });
  
  return this.save();
};

// 📊 Instance method to cancel advance
CashAdvanceSchema.methods.cancel = function(cancelledBy, reason) {
  if (this.status !== 'Pending') {
    throw new Error('Only pending advances can be cancelled');
  }
  
  this.status = 'Cancelled';
  this.lastUpdatedBy = cancelledBy;
  this.notes = `Cancelled: ${reason}`;
  return this.save();
};

// 📊 Instance method to get payment summary
CashAdvanceSchema.methods.getPaymentSummary = function() {
  const totalPaid = this.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentCount = this.paymentHistory.length;
  
  return {
    advanceId: this.advanceId,
    amount: this.amount,
    totalPaid,
    remainingBalance: this.remainingBalance,
    paymentCount,
    status: this.status,
    lastPayment: paymentCount > 0 ? this.paymentHistory[paymentCount - 1] : null
  };
};

const CashAdvance = mongoose.model('CashAdvance', CashAdvanceSchema);

export default CashAdvance;
