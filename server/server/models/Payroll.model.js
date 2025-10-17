import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema(
  {
    employeeName: { type: String, required: true },
    employeeId: { type: String, required: true },
    salary: { type: Number, required: true },
    deductions: { type: Number, required: true },
    netSalary: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Payroll = mongoose.model("Payroll", PayrollSchema);
export default Payroll;
