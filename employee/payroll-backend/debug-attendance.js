import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

async function debugAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('\n📅 Checking attendance for:', today.toISOString());
    console.log('📅 Until:', tomorrow.toISOString());

    // Find all attendance records for today
    const todayAttendance = await db.collection('attendances').find({
      date: { $gte: today, $lt: tomorrow }
    }).toArray();

    console.log('\n📊 Total attendance records for today:', todayAttendance.length);
    
    if (todayAttendance.length > 0) {
      console.log('\n🔍 Today\'s attendance records:');
      todayAttendance.forEach((record, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        console.log('ID:', record._id);
        console.log('Employee ID:', record.employeeId || 'N/A');
        console.log('Employee ObjectId:', record.employee || 'N/A');
        console.log('Date:', record.date);
        console.log('Time In:', record.timeIn || 'N/A');
        console.log('Time Out:', record.timeOut || 'N/A');
        console.log('Status:', record.status || 'N/A');
      });
    }

    // Check Gabriel's attendance by different search methods
    console.log('\n\n🔍 Searching for Gabriel Ludwig Rivera (ID: 7479)...');
    
    const gabrielByEmployeeId = await db.collection('attendances').find({
      employeeId: '7479',
      date: { $gte: today, $lt: tomorrow }
    }).toArray();
    console.log('By employeeId "7479":', gabrielByEmployeeId.length, 'records');

    const gabrielByEmployeeIdAlt = await db.collection('attendances').find({
      employeeId: 7479,
      date: { $gte: today, $lt: tomorrow }
    }).toArray();
    console.log('By employeeId 7479 (number):', gabrielByEmployeeIdAlt.length, 'records');

    // Get all employees to check Gabriel's _id
    const employees = await db.collection('employees').find({ employeeId: '7479' }).toArray();
    if (employees.length > 0) {
      console.log('\n👤 Found Gabriel in employees collection:');
      console.log('Name:', employees[0].firstName, employees[0].lastName);
      console.log('_id:', employees[0]._id);
      console.log('employeeId:', employees[0].employeeId);
      
      // Search by ObjectId
      const gabrielByObjectId = await db.collection('attendances').find({
        employee: employees[0]._id,
        date: { $gte: today, $lt: tomorrow }
      }).toArray();
      console.log('By employee ObjectId:', gabrielByObjectId.length, 'records');
    }

    // Show all attendance records (not just today) to see the pattern
    console.log('\n\n📊 ALL attendance records in database:');
    const allAttendance = await db.collection('attendances').find({}).sort({ date: -1 }).limit(20).toArray();
    console.log('Total records (showing last 20):', allAttendance.length);
    allAttendance.forEach((record, index) => {
      console.log(`\n--- Record ${index + 1} ---`);
      console.log('ID:', record._id);
      console.log('Employee ID:', record.employeeId || 'N/A');
      console.log('Employee ObjectId:', record.employee || 'N/A');
      console.log('Date:', record.date);
      console.log('Time In:', record.timeIn || 'N/A');
      console.log('Time Out:', record.timeOut || 'N/A');
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAttendance();
