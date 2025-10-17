import mongoose, {model} from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  // Link to employee by ObjectId (optional for legacy records)
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
  name: { type: String, required: true },
  type: { type: String, enum: ['Advance', 'Absent'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now }
});


export const Attendance = model("Attendance", AttendanceSchema);