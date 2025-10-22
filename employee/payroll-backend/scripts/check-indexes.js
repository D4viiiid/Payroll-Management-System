import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function checkIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check Employee collection indexes
    console.log('📊 EMPLOYEE COLLECTION INDEXES:');
    const employeeIndexes = await db.collection('employees').indexes();
    console.log(JSON.stringify(employeeIndexes, null, 2));
    console.log(`\n📈 Total Employee indexes: ${employeeIndexes.length}\n`);

    // Check Attendance collection indexes
    console.log('📊 ATTENDANCE COLLECTION INDEXES:');
    const attendanceIndexes = await db.collection('attendances').indexes();
    console.log(JSON.stringify(attendanceIndexes, null, 2));
    console.log(`\n📈 Total Attendance indexes: ${attendanceIndexes.length}\n`);

    // Check SalaryRate collection indexes
    console.log('📊 SALARYRATE COLLECTION INDEXES:');
    const salaryRateIndexes = await db.collection('salaryrates').indexes();
    console.log(JSON.stringify(salaryRateIndexes, null, 2));
    console.log(`\n📈 Total SalaryRate indexes: ${salaryRateIndexes.length}\n`);

    // Check CashAdvance collection indexes
    console.log('📊 CASHADVANCE COLLECTION INDEXES:');
    const cashAdvanceIndexes = await db.collection('cashadvances').indexes();
    console.log(JSON.stringify(cashAdvanceIndexes, null, 2));
    console.log(`\n📈 Total CashAdvance indexes: ${cashAdvanceIndexes.length}\n`);

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    process.exit(1);
  }
}

checkIndexes();
