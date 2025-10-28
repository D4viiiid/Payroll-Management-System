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

// 🔄 Force Vercel redeployment - October 29, 2025 04:55 UTC
// CRITICAL v1.0.6: This deployment MUST include:
// - Fixed archive employee 500 error (using updateOne instead of findByIdAndUpdate)
// - Fixed salary sync checking dayType instead of status
// - Fixed manual salary creation with proper validation
console.log('✅ Backend v1.0.6 - CRITICAL FIXES: Archive + Salary Sync + Attendance Matching');
console.log('⏰ Deployment Timestamp:', new Date().toISOString());
console.log('� Archive MUST use updateOne to bypass Mongoose middleware');
console.log('💰 Salary sync MUST check dayType field (Half Day, Full Day, Overtime)');
console.log('✅ Manual salary creation MUST validate timeOut and dayType');

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
// 🔐 Fingerprint Bridge Installer Routes
import fingerprintBridgeRouter from './routes/fingerprintBridge.js';
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

// ✅ CORS Configuration with environment variable + localhost support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'https://employee-frontend-eight-rust.vercel.app',
      'http://localhost:5173',  // ✅ Local frontend for fingerprint testing
      'http://localhost:3000',  // Alternative local port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      console.log('⚠️ CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

console.log('🔒 CORS Configuration:');
console.log('   Allowed Origins:', [
  process.env.CORS_ORIGIN || 'https://employee-frontend-eight-rust.vercel.app',
  'http://localhost:5173 (for fingerprint bridge testing)',
  'http://localhost:3000'
].join(', '));
console.log('   Allowed Headers:', corsOptions.allowedHeaders.join(', '));

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

// 🚀 SERVERLESS FIX: Import serverless-optimized DB connection
import connectDB from './utils/dbConnect.js';
// 🚀 DB Connection Middleware
import { ensureDBConnection } from './middleware/dbMiddleware.js';

// MongoDB Connection
console.log('📗 Serverless MongoDB connection ready (will connect on first request)');

// ✅ CRITICAL FIX: Export a FUNCTION that checks actual Mongoose connection state
// Don't use a static variable that never updates!
export const mongoConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

// ✅ For serverless (Vercel), we connect on-demand per request, not at startup
// Connection will be cached and reused across function invocations
// This prevents "buffering timed out" errors and 500 responses

console.log('Loading routes...');

// ✅ CRITICAL SERVERLESS FIX: Add DB connection middleware to ALL API routes
// This ensures MongoDB connection is established before processing any request
app.use('/api', ensureDBConnection);

// ✅ Routes (after express.json)
app.use("/api/biometric", biometricRoutes);
app.use("/api/biometric-integrated", biometricIntegrated); // New integrated routes
app.use('/api/employees', employeeRouter);
// 🏠 Root endpoint - Fix "Cannot GET /" error
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 Payroll Management System API - Running',
    version: '1.0.4', // 🚨 CRITICAL: v1.0.4 - Stats fix + Salary history auth fix
    status: 'operational',
    timestamp: new Date().toISOString(),
    deploymentNote: '✅ CRITICAL FIXES DEPLOYED: Dashboard stats calculation + Salary rate history public',
    criticalChanges: [
      'Stats: totalPresent = ALL who timed in (with OR without timeout)',
      'Stats: absent = totalEmployees - totalPresent',
      'Salary rate /history endpoint: PUBLIC ACCESS (no auth required)'
    ],
    endpoints: {
      employees: '/api/employees',
      attendance: '/api/attendance',
      deductions: '/api/deductions',
      payrolls: '/api/payrolls',
      salary: '/api/salary',
      biometric: '/api/biometric',
      fingerprint: '/api/fingerprint',
      salaryRate: '/api/salary-rate'
    },
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

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
// 🔐 Fingerprint Bridge Installer Routes
app.use('/api/fingerprint-bridge', fingerprintBridgeRouter);


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
