import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  salary: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["regular", "oncall"],
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  archived: {
    type: Boolean,
    default: false,
  },
});

const Salary = mongoose.model("Salary", salarySchema);
export default Salary;
