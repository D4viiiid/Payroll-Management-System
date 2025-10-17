import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  employeeId: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  timeIn: {
    type: Date,
    default: null,
  },
  timeOut: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present',
  },
  // Enhanced attendance validation fields (Phase 2)
  timeInStatus: {
    type: String,
    enum: ['On Time', 'Half Day', 'Incomplete', 'Absent'],
    default: null,
    description: 'Time-in validation: On Time (<=9:30), Half Day (>9:30), Incomplete (no time-out), Absent (no time-in)'
  },
  dayType: {
    type: String,
    enum: ['Full Day', 'Half Day', 'Incomplete', 'Absent'],
    default: null,
    description: 'Calculated day type based on time-in and hours worked'
  },
  actualHoursWorked: {
    type: Number,
    default: 0,
    description: 'Actual hours worked excluding lunch break (12:00-1:00 PM)'
  },
  overtimeHours: {
    type: Number,
    default: 0,
    description: 'Hours worked beyond 8 hours'
  },
  daySalary: {
    type: Number,
    default: 0,
    description: 'Calculated salary for this day (Full Day, Half Day, or 0 for Incomplete/Absent)'
  },
  overtimePay: {
    type: Number,
    default: 0,
    description: 'Overtime pay for hours beyond 8'
  },
  totalPay: {
    type: Number,
    default: 0,
    description: 'Total pay for the day (daySalary + overtimePay)'
  },
  validationReason: {
    type: String,
    default: '',
    description: 'Reason for the calculated day type (e.g., "Arrived after 9:30 AM but worked minimum 4 hours")'
  },
  isValidDay: {
    type: Boolean,
    default: false,
    description: 'Whether this day counts as valid work (Full Day or Half Day)'
  },
  archived: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    default: '',
  },
  // Legacy fields for backward compatibility
  time: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for faster queries
attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ dayType: 1, date: 1 });
attendanceSchema.index({ timeInStatus: 1 });

// Virtual to format date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date ? this.date.toLocaleDateString('en-US') : null;
});

// Virtual to format time-in
attendanceSchema.virtual('formattedTimeIn').get(function() {
  return this.timeIn ? this.timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
});

// Virtual to format time-out
attendanceSchema.virtual('formattedTimeOut').get(function() {
  return this.timeOut ? this.timeOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
});

// Instance method to check if attendance is complete
attendanceSchema.methods.isComplete = function() {
  return this.timeIn && this.timeOut;
};

// Instance method to check if valid for payroll
attendanceSchema.methods.isValidForPayroll = function() {
  return this.isValidDay && (this.dayType === 'Full Day' || this.dayType === 'Half Day');
};

// Static method to get attendance summary for period
attendanceSchema.statics.getAttendanceSummary = async function(employeeId, startDate, endDate) {
  const records = await this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
    archived: false
  }).sort({ date: 1 });

  const summary = {
    totalDays: records.length,
    fullDays: records.filter(r => r.dayType === 'Full Day').length,
    halfDays: records.filter(r => r.dayType === 'Half Day').length,
    incompleteDays: records.filter(r => r.dayType === 'Incomplete').length,
    absentDays: records.filter(r => r.dayType === 'Absent').length,
    totalHoursWorked: records.reduce((sum, r) => sum + (r.actualHoursWorked || 0), 0),
    totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
    totalBasicSalary: records.reduce((sum, r) => sum + (r.daySalary || 0), 0),
    totalOvertimePay: records.reduce((sum, r) => sum + (r.overtimePay || 0), 0),
    totalPay: records.reduce((sum, r) => sum + (r.totalPay || 0), 0),
  };

  return { records, summary };
};

const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');
export default Attendance;
