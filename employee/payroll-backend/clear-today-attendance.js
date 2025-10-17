/**
 * Clear Today's Attendance for Testing
 * This script deletes all attendance records for today to allow testing
 * the Time In -> Time Out workflow from scratch
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function clearTodayAttendance() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date range (Manila timezone)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`\n📅 Clearing attendance records for:`);
    console.log(`   From: ${today.toISOString()}`);
    console.log(`   To: ${tomorrow.toISOString()}`);

    // Find today's attendance records
    const Attendance = mongoose.connection.collection('attendances');
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).toArray();

    console.log(`\n📊 Found ${todayAttendance.length} attendance records for today:`);
    
    if (todayAttendance.length > 0) {
      // Get employee details
      const Employee = mongoose.connection.collection('employees');
      
      for (const record of todayAttendance) {
        const employee = await Employee.findOne({ _id: record.employee });
        const employeeName = employee 
          ? `${employee.firstName} ${employee.lastName}` 
          : 'Unknown';
        
        console.log(`\n   📝 ${employeeName}`);
        console.log(`      Date: ${record.date}`);
        console.log(`      Time In: ${record.timeIn || 'N/A'}`);
        console.log(`      Time Out: ${record.timeOut || 'N/A'}`);
        console.log(`      Status: ${record.status || 'N/A'}`);
      }

      console.log(`\n❓ Delete these ${todayAttendance.length} attendance record(s)? (y/n)`);
      
      // For automated testing, automatically delete
      // In production, you'd want to add readline for confirmation
      console.log('⚠️  Auto-confirming deletion for testing...');
      
      const result = await Attendance.deleteMany({
        date: {
          $gte: today,
          $lt: tomorrow
        }
      });

      console.log(`\n✅ Deleted ${result.deletedCount} attendance record(s)`);
      console.log('🎯 You can now test the Time In -> Time Out workflow from scratch!');
    } else {
      console.log('\n✅ No attendance records found for today. Ready to test!');
    }

    console.log('\n✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

clearTodayAttendance();
