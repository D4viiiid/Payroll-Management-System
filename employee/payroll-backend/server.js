import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ✅ CRITICAL: Load environment variables FIRST before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'config.env') });

// 🚀 PERFORMANCE: Initialize production logger (disables console.log in production)
import './utils/productionLogger.js';

// ✅ Verify email environment variables are loaded
console.log('🔍 Environment Variables Check (server.js):');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET!!!');
console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET (' + process.env.EMAIL_PASSWORD.length + ' chars)***' : 'NOT SET!!!');
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');

// Now import everything else AFTER env vars are loaded
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import NodeCache from 'node-cache';
// WebSocket removed - not needed
import deductionRouter from './routes/deductionRouter.js';
import payrollRouter from './routes/payrollRouter.js';
import employeeRouter from './routes/Employee.js';
import testEmailRouter from './routes/testEmail.js';
import salaryRouter from './routes/salaryRouter.js';
import fingerprintRoutes from "./routes/fingerprint.routes.js";
import { errorHandler } from './middleware/errorHandler.js';
import biometricRoutes from "./routes/biometricRoutes_ipc.js";
import biometricIntegrated from "./routes/biometricIntegrated.js";
import attendanceRouter from './routes/attendance.js';
// 💰 Phase 1 Enhancement: New Enhanced Routes
import enhancedPayrollRouter from './routes/enhancedPayroll.js';
import cashAdvanceRouter from './routes/cashAdvance.js';
import mandatoryDeductionsRouter from './routes/mandatoryDeductions.js';
// 📅 Phase 2 Enhancement: Schedule Routes
import scheduleRouter from './routes/schedule.js';
// 📊 Phase 3 Enhancement: Reports & Archive Routes
import reportsRouter from './routes/reports.js';
import archiveRouter from './routes/archive.js';
// 💰 Salary Rate Management Routes
import salaryRateRouter from './routes/salaryRate.js';
// 🤖 Phase 2 Enhancement: Automated Jobs
import { 
  scheduleWeeklyPayroll, 
  triggerPayrollManually, 
  getNextRunTime, 
  checkCurrentWeekPayroll 
} from './jobs/weeklyPayroll.js';
// 🤖 Phase 4 Enhancement: Additional Cron Jobs
import { scheduleAllJobs } from './jobs/cronJobs.js';
// 🤖 Attendance Auto-Close Jobs
import { scheduleAutoCloseShifts, scheduleEndOfDayShiftClose, runManualAutoClose } from './services/autoCloseShifts.js';
// 🚀 Performance Monitoring
import { responseTimeMiddleware } from './middleware/performanceMiddleware.js';
// 🚀 Cache Middleware
import { setCacheHeaders, cacheMiddleware, clearCache, noCache } from './middleware/cacheMiddleware.js';

const app = express();

// 🚀 PERFORMANCE: Initialize cache (TTL: 5 minutes by default)
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ✅ CORS Configuration with environment variable
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

console.log('🔒 CORS Configuration:');
console.log('   Allowed Origin:', corsOptions.origin);

// ✅ Middleware (must come first)
app.use(cors(corsOptions));
// 🚀 PERFORMANCE: Enable gzip/brotli compression (but skip small responses)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024 // Only compress responses > 1KB (performance optimization)
}));
// Increase JSON payload limit for profile picture uploads (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));
app.use(helmet());
// 🚀 PERFORMANCE: Track response times
app.use(responseTimeMiddleware);

// DEBUG ALL REQUESTS
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');
let mongoConnected = false;

// ✅ CRITICAL PERFORMANCE FIX: Add connection pooling and optimization settings
const mongooseOptions = {
  maxPoolSize: 50, // Maximum number of connections in the pool (default: 100, reduced to 50 for efficiency)
  minPoolSize: 10, // Minimum number of connections to keep open (ensures connections ready)
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 10000, // Timeout for server selection (10 seconds)
  family: 4, // Use IPv4, skip trying IPv6 (faster connection)
  maxIdleTimeMS: 30000, // Remove idle connections after 30 seconds
  connectTimeoutMS: 10000, // Timeout for initial connection (10 seconds)
  retryWrites: true, // Retry failed write operations
  w: 'majority', // Write concern for data durability
  // ✅ Performance optimization: Use secondary reads for non-critical data
  // This reduces load on primary and improves read performance
  readPreference: 'primaryPreferred', // Use primary, fall back to secondary if primary unavailable
};

// ✅ CRITICAL: Set Mongoose strictQuery to false to prevent deprecation warnings
mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db', mongooseOptions)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    mongoConnected = true;
    
    // Initialize scheduled tasks after MongoDB connection
    console.log('🤖 Initializing scheduled tasks...');
    scheduleAutoCloseShifts(); // Auto-close shifts after 12 hours
    scheduleEndOfDayShiftClose(); // Close remaining shifts at end of day
    console.log('✅ Scheduled tasks initialized');
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    console.log('⚠️  Falling back to local storage for biometric operations');
    mongoConnected = false;
  });

// Export for use in routes
export { mongoConnected };

console.log('Loading routes...');

// ✅ Routes (after express.json)
app.use("/api/biometric", biometricRoutes);
app.use("/api/biometric-integrated", biometricIntegrated); // New integrated routes
app.use('/api/employees', employeeRouter);
app.use('/api/deductions', deductionRouter);
app.use('/api/payrolls', payrollRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/email', testEmailRouter);
app.use("/api/fingerprint", fingerprintRoutes);
app.use('/api', attendanceRouter);
// 💰 Phase 1 Enhancement: Enhanced Routes
app.use('/api/enhanced-payroll', enhancedPayrollRouter);
app.use('/api/cash-advance', cashAdvanceRouter);
app.use('/api/mandatory-deductions', mandatoryDeductionsRouter);
// 📅 Phase 2 Enhancement: Schedule Routes
app.use('/api/schedules', scheduleRouter);
// 📊 Phase 3 Enhancement: Reports & Archive Routes
app.use('/api/reports', reportsRouter);
// 💰 Salary Rate Management Routes
app.use('/api/salary-rate', salaryRateRouter);
app.use('/api/archive', archiveRouter);


console.log('All routes loaded ✅');

// 🤖 Initialize Scheduled Jobs
let payrollJob = null;
let cronJobs = null;

if (process.env.ENABLE_AUTO_PAYROLL !== 'false') {
  console.log('\n🤖 Initializing automated jobs...');
  try {
    // Weekly payroll automation
    payrollJob = scheduleWeeklyPayroll();
    const nextRun = getNextRunTime();
    console.log(`✅ Weekly payroll job scheduled`);
    console.log(`⏰ Next run: ${nextRun.nextRun} (${nextRun.humanReadable})`);
    
    // Other automated jobs (attendance summaries, cash advance reminders, backups)
    cronJobs = scheduleAllJobs();
    
  } catch (error) {
    console.error('❌ Failed to schedule automated jobs:', error.message);
  }
} else {
  console.log('⚠️  Automated jobs are disabled (ENABLE_AUTO_PAYROLL=false)');
}

// Manual payroll trigger endpoint (for testing/emergency)
app.post('/api/admin/trigger-payroll', async (req, res) => {
  try {
    console.log('🔧 Manual payroll generation triggered');
    const result = await triggerPayrollManually();
    res.json(result);
  } catch (error) {
    console.error('❌ Error triggering payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check current week payroll status
app.get('/api/admin/payroll-status', async (req, res) => {
  try {
    const status = await checkCurrentWeekPayroll();
    const nextRun = getNextRunTime();
    res.json({
      success: true,
      currentWeek: status,
      nextScheduledRun: nextRun
    });
  } catch (error) {
    console.error('❌ Error checking payroll status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual trigger for auto-close shifts (for testing/admin use)
app.post('/api/admin/auto-close-shifts', async (req, res) => {
  try {
    console.log('🔧 Manual auto-close triggered');
    const result = await runManualAutoClose();
    res.json({
      success: true,
      message: `Auto-closed ${result.closed} shifts`,
      result
    });
  } catch (error) {
    console.error('❌ Error in manual auto-close:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// WebSocket functionality removed - not needed

// Export app for Vercel serverless functions
export default app;

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}
