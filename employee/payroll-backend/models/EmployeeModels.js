import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    required: false,
    trim: true,
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['regular', 'oncall', 'probationary'],
      message: 'Status must be one of "regular", "oncall", or "probationary"',
    },
    default: 'regular',
  },
  position: {
    type: String,
    required: false,
    trim: true,
  },
  hireDate: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function (value) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return value <= today;
      },
      message: 'Hire date cannot be in the future',
    },
  },
  salary: {
    type: Number,
    required: false,
    default: 0,
    min: [0, 'Salary cannot be negative'],
  },
  department: {
    type: String,
    required: false,
    trim: true,
  },

  // 🧩 Account fields
  username: {
    type: String,
    required: false,
    trim: true,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [4, 'Password must be at least 4 characters']
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  passwordChanged: {
    type: Boolean,
    default: false,
  },

  // ✋ Fingerprint fields (added)
  fingerprintEnrolled: {
    type: Boolean,
    default: false,
  },
  fingerprintTemplate: {
    type: String, // store encoded template or path to file
    default: null,
  },
}, {
  timestamps: true,
});

// 🔐 Hash password before saving
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// 🔍 Compare password
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
