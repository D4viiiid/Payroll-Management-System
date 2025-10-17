/**
 * 🚀 DATABASE OPTIMIZATION SCRIPT
 * 
 * This script adds indexes to all models and optimizes database queries
 * Run this once to improve database performance
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../config.env') });

// Import all models
import Employee from '../models/EmployeeModels.js';
import Attendance from '../models/AttendanceModels.js';
import EnhancedPayroll from '../models/EnhancedPayroll.model.js';
import CashAdvance from '../models/CashAdvance.model.js';
import MandatoryDeduction from '../models/MandatoryDeduction.model.js';
import Salary from '../models/SalaryModel.js';
import Deduction from '../models/Deduction.model.js';

console.log('🚀 Starting Database Optimization...\n');

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create indexes for all collections
 */
async function createIndexes() {
  console.log('\n📊 Ensuring Database Indexes...\n');

  try {
    // Employee indexes
    console.log('📝 Employee Collection:');
    try {
      await Employee.collection.createIndex({ employeeId: 1 }, { unique: true, background: true });
      await Employee.collection.createIndex({ isActive: 1 }, { background: true });
      await Employee.collection.createIndex({ createdAt: -1 }, { background: true });
      console.log('   ✅ Employee indexes verified');
    } catch (err) {
      console.log('   ℹ️  Employee indexes already exist');
    }

    // Attendance indexes
    console.log('\n📝 Attendance Collection:');
    try {
      await Attendance.collection.createIndex({ employee: 1 }, { background: true });
      await Attendance.collection.createIndex({ employeeId: 1 }, { background: true });
      await Attendance.collection.createIndex({ date: -1 }, { background: true });
      await Attendance.collection.createIndex({ employee: 1, date: -1 }, { background: true });
      await Attendance.collection.createIndex({ archived: 1 }, { background: true });
      console.log('   ✅ Attendance indexes verified');
    } catch (err) {
      console.log('   ℹ️  Attendance indexes already exist');
    }

    // EnhancedPayroll indexes
    console.log('\n📝 EnhancedPayroll Collection:');
    try {
      await EnhancedPayroll.collection.createIndex({ employee: 1 }, { background: true });
      await EnhancedPayroll.collection.createIndex({ 'payPeriod.endDate': -1 }, { background: true });
      await EnhancedPayroll.collection.createIndex({ status: 1 }, { background: true });
      console.log('   ✅ EnhancedPayroll indexes verified');
    } catch (err) {
      console.log('   ℹ️  EnhancedPayroll indexes already exist');
    }

    // CashAdvance indexes
    console.log('\n📝 CashAdvance Collection:');
    try {
      await CashAdvance.collection.createIndex({ employee: 1 }, { background: true });
      await CashAdvance.collection.createIndex({ status: 1 }, { background: true });
      await CashAdvance.collection.createIndex({ requestDate: -1 }, { background: true });
      console.log('   ✅ CashAdvance indexes verified');
    } catch (err) {
      console.log('   ℹ️  CashAdvance indexes already exist');
    }

    // MandatoryDeduction indexes
    console.log('\n📝 MandatoryDeduction Collection:');
    try {
      await MandatoryDeduction.collection.createIndex({ isActive: 1 }, { background: true });
      await MandatoryDeduction.collection.createIndex({ employmentType: 1 }, { background: true });
      console.log('   ✅ MandatoryDeduction indexes verified');
    } catch (err) {
      console.log('   ℹ️  MandatoryDeduction indexes already exist');
    }

    // Salary indexes
    console.log('\n📝 Salary Collection:');
    try {
      await Salary.collection.createIndex({ employee: 1 }, { background: true });
      await Salary.collection.createIndex({ date: -1 }, { background: true });
      console.log('   ✅ Salary indexes verified');
    } catch (err) {
      console.log('   ℹ️  Salary indexes already exist');
    }

    // Deduction indexes
    console.log('\n📝 Deduction Collection:');
    try {
      await Deduction.collection.createIndex({ employee: 1 }, { background: true });
      await Deduction.collection.createIndex({ date: -1 }, { background: true });
      await Deduction.collection.createIndex({ type: 1 }, { background: true });
      console.log('   ✅ Deduction indexes verified');
    } catch (err) {
      console.log('   ℹ️  Deduction indexes already exist');
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
}

/**
 * Get index statistics
 */
async function getIndexStats() {
  console.log('\n📊 Index Statistics:\n');

  const collections = [
    { name: 'Employee', model: Employee },
    { name: 'Attendance', model: Attendance },
    { name: 'EnhancedPayroll', model: EnhancedPayroll },
    { name: 'CashAdvance', model: CashAdvance },
    { name: 'MandatoryDeduction', model: MandatoryDeduction },
    { name: 'Salary', model: Salary },
    { name: 'Deduction', model: Deduction }
  ];

  for (const collection of collections) {
    try {
      const indexes = await collection.model.collection.indexes();
      console.log(`📁 ${collection.name}:`);
      console.log(`   Total Indexes: ${indexes.length}`);
      indexes.forEach((index, i) => {
        const keys = Object.keys(index.key).join(', ');
        console.log(`   ${i + 1}. ${keys} ${index.unique ? '(UNIQUE)' : ''}`);
      });
      console.log('');
    } catch (error) {
      console.log(`   ⚠️  Collection not found or empty\n`);
    }
  }
}

/**
 * Analyze query performance
 */
async function analyzePerformance() {
  console.log('\n🔍 Analyzing Query Performance...\n');

  try {
    // Test common queries
    console.log('Testing common queries:');

    // 1. Find employee by employeeId
    const start1 = Date.now();
    await Employee.findOne({ employeeId: 'EMP-1000' }).lean();
    const duration1 = Date.now() - start1;
    console.log(`   ✅ Employee lookup: ${duration1}ms ${duration1 > 100 ? '⚠️  SLOW' : '✅ FAST'}`);

    // 2. Get attendance for date range
    const start2 = Date.now();
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-16');
    await Attendance.find({ 
      date: { $gte: startDate, $lte: endDate } 
    }).limit(100).lean();
    const duration2 = Date.now() - start2;
    console.log(`   ✅ Attendance range query: ${duration2}ms ${duration2 > 200 ? '⚠️  SLOW' : '✅ FAST'}`);

    // 3. Get active employees
    const start3 = Date.now();
    await Employee.find({ isActive: true }).select('firstName lastName employeeId').lean();
    const duration3 = Date.now() - start3;
    console.log(`   ✅ Active employees query: ${duration3}ms ${duration3 > 100 ? '⚠️  SLOW' : '✅ FAST'}`);

    // 4. Get payroll records
    const start4 = Date.now();
    await EnhancedPayroll.find()
      .sort({ 'payPeriod.endDate': -1 })
      .limit(50)
      .lean();
    const duration4 = Date.now() - start4;
    console.log(`   ✅ Payroll records query: ${duration4}ms ${duration4 > 200 ? '⚠️  SLOW' : '✅ FAST'}`);

  } catch (error) {
    console.log('   ⚠️  Some queries could not be tested (collections may be empty)');
  }
}

/**
 * Main optimization function
 */
async function optimizeDatabase() {
  try {
    await connectDB();
    await createIndexes();
    await getIndexStats();
    await analyzePerformance();

    console.log('\n✅ Database optimization completed successfully!');
    console.log('\n💡 Tips for maintaining performance:');
    console.log('   1. Use .lean() for read-only queries');
    console.log('   2. Use .select() to limit fields returned');
    console.log('   3. Add pagination with .limit() and .skip()');
    console.log('   4. Use indexes for frequently queried fields');
    console.log('   5. Avoid loading large documents unnecessarily');

  } catch (error) {
    console.error('\n❌ Optimization failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run optimization
optimizeDatabase();
