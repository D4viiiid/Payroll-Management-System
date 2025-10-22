import mongoose from "mongoose";

const DeductionSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["Advance", "Absent", "Half Day"], required: true },
  amount: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(value) {
        // If this is a cash advance, validate max amount
        if (this.type === 'Advance') {
          return value > 0 && value <= 1100; // Updated from 1000 to 1100 (2 days × ₱550)
        }
        return value >= 0; // Other deductions must be non-negative
      },
      message: function(props) {
        if (props.instance.type === 'Advance') {
          return 'Cash advance amount cannot exceed ₱1,100 (2 days salary)';
        }
        return 'Amount must be a non-negative number';
      }
    }
  },
  date: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ["regular", "oncall", "probationary"], required: true },
  processed: { type: Boolean, default: false } // Track if deduction has been processed in payroll
}, {
  timestamps: true
});

// ===== PERFORMANCE INDEXES =====
// ✅ FIX ISSUE: Add indexes for frequently queried fields to improve performance
DeductionSchema.index({ employee: 1 }); // Employee reference lookups
DeductionSchema.index({ type: 1 }); // Filter by deduction type
DeductionSchema.index({ date: -1 }); // Sort by date
DeductionSchema.index({ processed: 1 }); // Filter processed/unprocessed
DeductionSchema.index({ employee: 1, date: -1 }); // Compound index for employee+date queries

export default mongoose.model("Deduction", DeductionSchema);
