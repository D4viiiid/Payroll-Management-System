import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import deductionRouter from './routes/deductionRouter.js';
import payrollRouter from './routes/payrollRouter.js';
import employeeRouter from './routes/Employee.js';
import testEmailRouter from './routes/testEmail.js';
import salaryRouter from './routes/salaryRouter.js';
import fingerprintRoutes from "./routes/fingerprint.routes.js";
import { errorHandler } from './middleware/errorHandler.js';
import biometricRoutes from "./routes/biometricRoutes_ipc.js"; // IPC VERSION
import attendanceRouter from './routes/attendance.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from config.env
dotenv.config({ path: join(__dirname, 'config.env') });

const app = express();

// ✅ Middleware (must come first)
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());

// DEBUG ALL REQUESTS
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');
let mongoConnected = false;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db')
  .then(() => {
    console.log('MongoDB Connected Successfully');
    mongoConnected = true;
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
app.use("/api/biometric", biometricRoutes); // IPC VERSION
app.use('/api/employees', employeeRouter);
app.use('/api/deductions', deductionRouter);
app.use('/api/payrolls', payrollRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/email', testEmailRouter);
app.use("/api/fingerprint", fingerprintRoutes);
app.use('/api', attendanceRouter);


console.log('All routes loaded ✅ (IPC Biometric Version)');

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT} (IPC Biometric Mode)`));
