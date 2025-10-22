import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Employee from '../models/EmployeeModels.js';
import Attendance from '../models/AttendanceModels.js';
import SalaryRate from '../models/SalaryRate.js';
import CashAdvance from '../models/CashAdvance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

// ✅ CRITICAL: Apply same connection pooling settings as server.js
const mongooseOptions = {
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  family: 4,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  w: 'majority',
  readPreference: 'primaryPreferred',
};

async function testPerformance() {
  try {
    console.log('🔌 Connecting to MongoDB with optimized settings...');
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Employee GET query (simulate admin page load)
    console.log('📊 TEST 1: Employee GET query (Admin Employee Page)');
    console.log('Query: Employee.find().select("-__v -password").sort({ createdAt: -1 }).lean()');
    const start1 = Date.now();
    const employees = await Employee.find()
      .select('-__v -password')
      .sort({ createdAt: -1 })
      .lean();
    const time1 = Date.now() - start1;
    console.log(`⏱️  Execution time: ${time1}ms`);
    console.log(`📄 Documents returned: ${employees.length}`);
    console.log(`${time1 < 500 ? '✅ PASS' : '❌ FAIL'} (Target: <500ms)\n`);

    // Test 2: Employee Login query (username + isActive)
    console.log('📊 TEST 2: Employee Login query');
    console.log('Query: Employee.findOne({ username: "admin", isActive: true }).select("+password")');
    const start2 = Date.now();
    const loginEmployee = await Employee.findOne({ username: "admin", isActive: true })
      .select('+password');
    const time2 = Date.now() - start2;
    console.log(`⏱️  Execution time: ${time2}ms`);
    console.log(`📄 Employee found: ${loginEmployee ? 'Yes' : 'No'}`);
    console.log(`${time2 < 200 ? '✅ PASS' : '❌ FAIL'} (Target: <200ms)\n`);

    // Test 3: Attendance GET query (page load)
    console.log('📊 TEST 3: Attendance GET query (Attendance Page)');
    console.log('Query: Attendance.find().sort({ date: -1 }).limit(50).lean()');
    const start3 = Date.now();
    const attendance = await Attendance.find()
      .sort({ date: -1 })
      .limit(50)
      .lean();
    const time3 = Date.now() - start3;
    console.log(`⏱️  Execution time: ${time3}ms`);
    console.log(`📄 Documents returned: ${attendance.length}`);
    console.log(`${time3 < 500 ? '✅ PASS' : '❌ FAIL'} (Target: <500ms)\n`);

    // Test 4: SalaryRate current query
    console.log('📊 TEST 4: SalaryRate current query');
    console.log('Query: SalaryRate.findOne({ isActive: true }).sort({ effectiveDate: -1 }).lean()');
    const start4 = Date.now();
    const salaryRate = await SalaryRate.findOne({ isActive: true })
      .sort({ effectiveDate: -1 })
      .lean();
    const time4 = Date.now() - start4;
    console.log(`⏱️  Execution time: ${time4}ms`);
    console.log(`📄 Salary rate found: ${salaryRate ? 'Yes' : 'No'}`);
    console.log(`${time4 < 200 ? '✅ PASS' : '❌ FAIL'} (Target: <200ms)\n`);

    // Test 5: Cash Advance archived query
    console.log('📊 TEST 5: Cash Advance archived query');
    console.log('Query: CashAdvance.find({ archived: true }).sort({ requestDate: -1 }).lean()');
    const start5 = Date.now();
    const cashAdvances = await CashAdvance.find({ archived: true })
      .sort({ requestDate: -1 })
      .lean();
    const time5 = Date.now() - start5;
    console.log(`⏱️  Execution time: ${time5}ms`);
    console.log(`📄 Documents returned: ${cashAdvances.length}`);
    console.log(`${time5 < 500 ? '✅ PASS' : '❌ FAIL'} (Target: <500ms)\n`);

    // Test 6: Multiple concurrent queries (stress test)
    console.log('📊 TEST 6: Concurrent queries (Connection Pool Test)');
    console.log('Running 10 concurrent employee queries...');
    const start6 = Date.now();
    const concurrentPromises = Array(10).fill(0).map(() => 
      Employee.find().select('-__v -password').lean()
    );
    await Promise.all(concurrentPromises);
    const time6 = Date.now() - start6;
    console.log(`⏱️  Total execution time: ${time6}ms`);
    console.log(`⏱️  Average per query: ${Math.round(time6 / 10)}ms`);
    console.log(`${time6 < 2000 ? '✅ PASS' : '❌ FAIL'} (Target: <2000ms total)\n`);

    // Calculate overall score
    const avgTime = Math.round((time1 + time2 + time3 + time4 + time5) / 5);
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 OVERALL AVERAGE QUERY TIME: ${avgTime}ms`);
    console.log(`${avgTime < 350 ? '✅ EXCELLENT PERFORMANCE' : avgTime < 500 ? '⚠️  ACCEPTABLE PERFORMANCE' : '❌ NEEDS OPTIMIZATION'}`);
    console.log('═══════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing performance:', error);
    process.exit(1);
  }
}

testPerformance();
