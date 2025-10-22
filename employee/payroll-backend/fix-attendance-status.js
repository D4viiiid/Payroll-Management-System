import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Attendance } from './models/Attendance.model.js';

dotenv.config({ path: './config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

/**
 * Fix script to update old attendance records with wrong status values
 * 
 * Problem: Old records have status='present' even when they have both timeIn and timeOut
 * Solution: Recalculate status based on hours worked for all records with timeOut
 */

async function fixAttendanceStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all attendance records that have both timeIn and timeOut
    const recordsToFix = await Attendance.find({
      timeIn: { $exists: true, $ne: null },
      timeOut: { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${recordsToFix.length} records with both timeIn and timeOut\n`);

    let updatedCount = 0;
    let alreadyCorrectCount = 0;

    for (const record of recordsToFix) {
      const timeIn = new Date(record.timeIn);
      const timeOut = new Date(record.timeOut);
      
      // Calculate hours worked
      const diffMs = timeOut - timeIn;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Subtract 1 hour for lunch if worked through 12-1 PM
      const timeInHour = timeIn.getHours();
      const timeOutHour = timeOut.getHours();
      let hoursWorked = diffHours;
      
      if (timeInHour < 13 && timeOutHour >= 13) {
        hoursWorked -= 1;
      }
      
      // Determine correct status based on hours worked
      let correctStatus;
      if (hoursWorked < 4) {
        correctStatus = 'invalid';
      } else if (hoursWorked < 6.5) {
        correctStatus = 'half-day';
      } else if (hoursWorked <= 8) {
        correctStatus = 'full-day';
      } else {
        // Check if timed out after 5 PM for overtime
        if (timeOutHour >= 17) {
          correctStatus = 'overtime';
        } else {
          correctStatus = 'full-day';
        }
      }
      
      // Check if status needs update
      if (record.status !== correctStatus) {
        const oldStatus = record.status;
        record.status = correctStatus;
        await record.save();
        
        console.log(`✅ Updated ${record.employeeId} (${record.date.toISOString().split('T')[0]}): ${hoursWorked.toFixed(2)} hours | ${oldStatus} → ${correctStatus}`);
        updatedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total records checked: ${recordsToFix.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ✓ Already correct: ${alreadyCorrectCount}`);
    console.log('\n✅ Status fix complete!');

  } catch (error) {
    console.error('❌ Error fixing attendance status:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the fix
fixAttendanceStatus();
