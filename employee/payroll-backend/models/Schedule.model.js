import mongoose from 'mongoose';

/**
 * Schedule Model for Daily Employee Assignments
 * Validates daily schedules with 2 regular + 3 on-call employees
 */

const scheduleSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true,
    description: 'Date for this schedule (midnight)'
  },
  regularEmployees: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    employeeId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      description: 'Admin who assigned this employee'
    }
  }],
  onCallEmployees: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    employeeId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
      description: 'On-call priority: 1 = First call, 2 = Second, 3 = Third'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      description: 'Admin who assigned this employee'
    },
    called: {
      type: Boolean,
      default: false,
      description: 'Whether this on-call employee was called in to work'
    },
    calledAt: {
      type: Date,
      description: 'When the employee was called in'
    }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Completed', 'Cancelled'],
    default: 'Draft',
    description: 'Schedule status'
  },
  notes: {
    type: String,
    default: '',
    description: 'Additional notes for this day schedule'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'Admin who created this schedule'
  },
  publishedAt: {
    type: Date,
    description: 'When the schedule was published/finalized'
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    description: 'Admin who published this schedule'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
scheduleSchema.index({ date: 1, status: 1 });
scheduleSchema.index({ 'regularEmployees.employee': 1 });
scheduleSchema.index({ 'onCallEmployees.employee': 1 });

// Virtual for formatted date
scheduleSchema.virtual('formattedDate').get(function() {
  return this.date ? this.date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : null;
});

// Virtual for day of week
scheduleSchema.virtual('dayOfWeek').get(function() {
  return this.date ? this.date.toLocaleDateString('en-US', { weekday: 'long' }) : null;
});

// Instance method to validate schedule
scheduleSchema.methods.validateSchedule = function() {
  const errors = [];

  // Check regular employees count (must be exactly 2)
  if (this.regularEmployees.length !== 2) {
    errors.push(`Must have exactly 2 regular employees (currently have ${this.regularEmployees.length})`);
  }

  // Check on-call employees count (must be exactly 3)
  if (this.onCallEmployees.length !== 3) {
    errors.push(`Must have exactly 3 on-call employees (currently have ${this.onCallEmployees.length})`);
  }

  // Check for duplicate employees across all assignments
  const allEmployeeIds = [
    ...this.regularEmployees.map(e => e.employeeId),
    ...this.onCallEmployees.map(e => e.employeeId)
  ];
  
  const duplicates = allEmployeeIds.filter((id, index) => allEmployeeIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate employee assignments found: ${[...new Set(duplicates)].join(', ')}`);
  }

  // Check on-call priorities (must be 1, 2, 3)
  const priorities = this.onCallEmployees.map(e => e.priority).sort();
  if (JSON.stringify(priorities) !== '[1,2,3]') {
    errors.push('On-call employees must have priorities 1, 2, and 3');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Instance method to check if employee is assigned
scheduleSchema.methods.isEmployeeAssigned = function(employeeId) {
  const inRegular = this.regularEmployees.some(e => e.employeeId === employeeId);
  const inOnCall = this.onCallEmployees.some(e => e.employeeId === employeeId);
  
  return {
    assigned: inRegular || inOnCall,
    type: inRegular ? 'Regular' : inOnCall ? 'On-Call' : null
  };
};

// Instance method to call in an on-call employee
scheduleSchema.methods.callInEmployee = function(employeeId, calledBy) {
  const onCallEmployee = this.onCallEmployees.find(e => e.employeeId === employeeId);
  
  if (!onCallEmployee) {
    throw new Error('Employee not found in on-call list');
  }

  if (onCallEmployee.called) {
    throw new Error('Employee has already been called in');
  }

  onCallEmployee.called = true;
  onCallEmployee.calledAt = new Date();
  
  return this.save();
};

// Instance method to publish schedule
scheduleSchema.methods.publishSchedule = function(publishedBy) {
  const validation = this.validateSchedule();
  
  if (!validation.isValid) {
    throw new Error(`Cannot publish invalid schedule: ${validation.errors.join(', ')}`);
  }

  this.status = 'Published';
  this.publishedAt = new Date();
  this.publishedBy = publishedBy;
  
  return this.save();
};

// Static method to get schedule for a date
scheduleSchema.statics.getScheduleForDate = async function(date) {
  // Normalize date to midnight
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  return await this.findOne({ 
    date: normalizedDate,
    status: { $ne: 'Cancelled' }
  }).populate('regularEmployees.employee onCallEmployees.employee');
};

// Static method to get schedules for date range
scheduleSchema.statics.getSchedulesForRange = async function(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return await this.find({
    date: { $gte: start, $lte: end },
    status: { $ne: 'Cancelled' }
  })
  .sort({ date: 1 })
  .populate('regularEmployees.employee onCallEmployees.employee');
};

// Static method to get employee's upcoming schedules
scheduleSchema.statics.getEmployeeSchedules = async function(employeeId, startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return await this.find({
    date: { $gte: start, $lte: end },
    status: 'Published',
    $or: [
      { 'regularEmployees.employeeId': employeeId },
      { 'onCallEmployees.employeeId': employeeId }
    ]
  })
  .sort({ date: 1 });
};

// Static method to check if employee is available for a date
scheduleSchema.statics.isEmployeeAvailable = async function(employeeId, date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const existing = await this.findOne({
    date: normalizedDate,
    status: { $ne: 'Cancelled' },
    $or: [
      { 'regularEmployees.employeeId': employeeId },
      { 'onCallEmployees.employeeId': employeeId }
    ]
  });

  return !existing;
};

// Static method to get statistics
scheduleSchema.statics.getStatistics = async function(startDate, endDate) {
  const schedules = await this.getSchedulesForRange(startDate, endDate);

  const stats = {
    totalSchedules: schedules.length,
    publishedSchedules: schedules.filter(s => s.status === 'Published').length,
    draftSchedules: schedules.filter(s => s.status === 'Draft').length,
    completedSchedules: schedules.filter(s => s.status === 'Completed').length,
    totalRegularAssignments: schedules.reduce((sum, s) => sum + s.regularEmployees.length, 0),
    totalOnCallAssignments: schedules.reduce((sum, s) => sum + s.onCallEmployees.length, 0),
    totalCalledIn: schedules.reduce((sum, s) => 
      sum + s.onCallEmployees.filter(e => e.called).length, 0),
  };

  return stats;
};

// Pre-save validation
scheduleSchema.pre('save', function(next) {
  // Normalize date to midnight
  if (this.date) {
    const normalizedDate = new Date(this.date);
    normalizedDate.setHours(0, 0, 0, 0);
    this.date = normalizedDate;
  }

  // Ensure on-call priorities are unique and in range 1-3
  const priorities = this.onCallEmployees.map(e => e.priority);
  const uniquePriorities = [...new Set(priorities)];
  
  if (priorities.length !== uniquePriorities.length) {
    // Auto-fix duplicate priorities
    this.onCallEmployees.forEach((emp, index) => {
      emp.priority = index + 1;
    });
  }

  next();
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
