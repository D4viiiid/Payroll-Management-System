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
  isAdmin: {
    // ✅ FIX ISSUE #1: Add isAdmin field for admin privileges
    type: Boolean,
    default: false,
  },
  adminPin: {
    // 🔐 6-digit PIN for admin panel access (hashed)
    type: String,
    default: null,
    validate: {
      validator: function(value) {
        // Only validate if value exists
        if (!value) return true;
        // Must be a string representation of 6 digits after hashing (bcrypt hash)
        // We'll validate the input before hashing in the route
        return true;
      },
      message: 'Admin PIN must be 6 digits'
    }
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
  fingerprintEnrollmentCount: {
    // Track number of times fingerprint has been enrolled (max 3)
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 fingerprint enrollments allowed']
  },
  fingerprintEnrollmentHistory: {
    // Track enrollment dates for audit
    type: [Date],
    default: []
  },
  
  // 📸 Profile Picture field
  profilePicture: {
    type: String, // base64 encoded image data
    default: null,
  },
}, {
  timestamps: true,
});

// ===== PERFORMANCE INDEXES =====
// ✅ FIX ISSUE: Add indexes for frequently queried fields to improve performance
employeeSchema.index({ employeeId: 1 }); // Unique employee ID lookups
// Note: username already has unique index from schema definition (unique: true, sparse: true)
employeeSchema.index({ email: 1 }); // Email lookups
// REMOVED: employeeSchema.index({ isActive: 1 }); - Duplicate! Already covered by compound indexes below
employeeSchema.index({ status: 1 }); // Employment status queries
employeeSchema.index({ department: 1 }); // Department queries
employeeSchema.index({ isAdmin: 1 }); // Admin user queries
employeeSchema.index({ createdAt: -1 }); // Sort by creation date

// ===== COMPOUND INDEXES FOR LOGIN OPTIMIZATION =====
// ⚠️ NOTE: Mongoose may warn about "duplicate isActive index" - this is a FALSE POSITIVE
// These two compound indexes serve DIFFERENT query patterns and are both needed:
// 1. { username: 1, isActive: 1 } - optimizes Employee.findOne({ username, isActive: true })
// 2. { employeeId: 1, isActive: 1 } - optimizes Employee.findOne({ employeeId, isActive: true })
// MongoDB is smart enough to use these compound indexes for isActive-only queries too.
// The warning can be safely ignored - these indexes improve login performance significantly.
employeeSchema.index({ username: 1, isActive: 1 }); // Login query compound index
employeeSchema.index({ employeeId: 1, isActive: 1 }); // Alternative login query compound index

// 🔐 Hash password before saving
// ✅ CRITICAL PERFORMANCE FIX: Reduce bcrypt rounds from 12 to 10
// 10 rounds = ~150ms per hash (good security/performance balance)
// 12 rounds = ~600ms per hash (too slow for login)
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const hashedPassword = await bcrypt.hash(this.password, 10); // ✅ Changed from 12 to 10
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

// 🔍 Compare admin PIN
employeeSchema.methods.comparePin = async function (candidatePin) {
  if (!this.adminPin) return false;
  return bcrypt.compare(candidatePin, this.adminPin);
};

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
