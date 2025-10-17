import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  // Employee Reference
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee',
    required: false // Made optional for backward compatibility
  },
  
  // Employee Information (for quick access)
  employeeName: { type: String, required: false },
  employeeId: { type: String, required: false },
  
  // Payroll Period
  startDate: { type: Date, required: false },
  endDate: { type: Date, required: false },
  cutoffDate: { type: Date, required: false },
  
  // Salary Breakdown
  salary: { type: Number, required: true, default: 0 },
  cashAdvance: { type: Number, default: 0 },
  deductions: { type: Number, required: true, default: 0 },
  netSalary: { type: Number, required: true, default: 0 },
  
  // Payment Status
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Processing'], 
    default: 'Pending' 
  },
  
  // Archival Status
  archived: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Payroll', PayrollSchema);
