import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  // ✅ CONTACT NUMBER FIELD - ADDED
  contactNumber: {
  type: String,
  required: true, // ✅ PALITAN TO TRUE
  trim: true
},
  employeeId: {
    type: String,
    required: false,
    trim: true
  },
  // ✅ STATUS FIELD - ADDED
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['regular', 'oncall'],
      message: 'Status must be either "regular" or "oncall"'
    },
    default: 'regular'
  },
  position: {
    type: String,
    required: false,
    trim: true
  },
  department: {
    type: String,
    required: false,
    trim: true
  },
  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: [0, 'Salary cannot be negative']
  },
  hireDate: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(value) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return value <= today;
      },
      message: 'Hire date cannot be in the future'
    }
  },
  // Account fields
  username: {
    type: String,
    required: false,
    trim: true,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: false,
    minlength: [6, 'Password must be at least 6 characters']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  passwordChanged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;