import mongoose, {model} from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  // Link to employee by ObjectId
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  
  // Employee ID string for quick reference
  employeeId: { 
    type: String, 
    required: true 
  },
  
  // Date field (midnight of the day in Manila timezone)
  date: { 
    type: Date, 
    required: true 
  },
  
  // Time In (actual scan time with timezone)
  timeIn: { 
    type: Date, 
    required: true 
  },
  
  // Time Out (actual scan time with timezone)
  timeOut: { 
    type: Date, 
    default: null 
  },
  
  // Attendance status
  // ✅ FIX ISSUE #1 & #2: Updated status enum values
  // Status rules:
  // - present: Employee clocked in only (no clock out yet) - Currently working
  // - invalid: Worked <4 hours (0% pay - No Pay)
  // - half-day: Worked 4 to <6.5 hours (variable pay by exact hours)
  // - full-day: Worked 6.5-8 hours (100% daily rate)
  // - overtime: Worked >6.5 hrs + timed out after 5PM (Full pay + OT rate)
  // - absent: No time-in record for the day (0% pay)
  status: { 
    type: String, 
    enum: ['present', 'half-day', 'full-day', 'absent', 'invalid', 'overtime', 'late'], 
    default: 'present' 
  },
  
  // Day type (human-readable status)
  dayType: {
    type: String,
    enum: ['Full Day', 'Half Day', 'Invalid', 'Overtime', 'Absent', 'Incomplete'],
    default: 'Incomplete'
  },
  
  // Time-in status (for late arrivals)
  timeInStatus: {
    type: String,
    enum: ['On Time', 'Half Day', 'Late'],
    default: 'On Time'
  },
  
  // Calculated hours worked (excluding lunch break)
  actualHoursWorked: {
    type: Number,
    default: 0
  },
  
  // Overtime hours
  overtimeHours: {
    type: Number,
    default: 0
  },
  
  // Daily salary earned
  daySalary: {
    type: Number,
    default: 0
  },
  
  // Overtime pay earned
  overtimePay: {
    type: Number,
    default: 0
  },
  
  // Total pay (daySalary + overtimePay)
  totalPay: {
    type: Number,
    default: 0
  },
  
  // Whether the attendance is valid for payroll
  isValidDay: {
    type: Boolean,
    default: true
  },
  
  // Validation reason (e.g., "Worked less than 4 hours")
  validationReason: {
    type: String,
    default: ''
  },
  
  // Notes
  notes: {
    type: String,
    default: ''
  },
  
  // Legacy time field for backward compatibility
  time: {
    type: Date
  },
  
  // Archived flag for historical records
  archived: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt automatically
});

// Index for faster queries
AttendanceSchema.index({ employee: 1, date: -1 });
AttendanceSchema.index({ employeeId: 1, date: -1 });
AttendanceSchema.index({ date: -1 });
AttendanceSchema.index({ archived: 1, date: -1 });

export const Attendance = model("Attendance", AttendanceSchema);