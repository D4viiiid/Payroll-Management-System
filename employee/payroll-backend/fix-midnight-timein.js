/**
 * FIX SCRIPT: Correct 12:00 AM time-in records to 8:00 AM
 * 
 * PROBLEM: Some attendance records have timeIn showing as 12:00 AM (midnight)
 * when they should be 8:00 AM (start of work day)
 * 
 * ROOT CAUSE: Timezone conversion issue during data entry
 * 
 * SOLUTION: Update all records with timeIn hour = 0 (midnight) to hour = 8 (8 AM)
 */

import mongoose from 'mongoose';
import Attendance from './models/AttendanceModels.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function fixMidnightTimeIn() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all attendance records with timeIn hour = 0 (midnight)
    const midnightRecords = await Attendance.find({
      timeIn: { $exists: true, $ne: null }
    }).lean();

    console.log(`📊 Found ${midnightRecords.length} total attendance records`);

    let fixedCount = 0;
    const fixes = [];

    for (const record of midnightRecords) {
      const timeIn = new Date(record.timeIn);
      const timeInHour = timeIn.getHours(); // Get local hour
      
      // Only fix if the DISPLAYED hour (in Manila timezone) is 0 (midnight) or 12 AM
      // This means the time shows as 12:00 AM in the UI
      if (timeInHour === 0) {
        // Create corrected timeIn with 8:00 AM same date
        const correctedTimeIn = new Date(timeIn);
        correctedTimeIn.setHours(8, 0, 0, 0); // Set to 8 AM Manila time

        // Also fix timeOut if needed (adjust based on work hours)
        let correctedTimeOut = null;
        if (record.timeOut) {
          const timeOut = new Date(record.timeOut);
          const originalHoursDiff = (timeOut - timeIn) / (1000 * 60 * 60);
          
          // Add the same hours difference to the new timeIn
          correctedTimeOut = new Date(correctedTimeIn);
          correctedTimeOut.setHours(correctedTimeOut.getHours() + originalHoursDiff);
        }

        fixes.push({
          _id: record._id,
          employeeId: record.employeeId,
          date: record.date,
          oldTimeIn: timeIn.toISOString(),
          newTimeIn: correctedTimeIn.toISOString(),
          oldTimeOut: record.timeOut,
          newTimeOut: correctedTimeOut
        });

        // Update the record
        await Attendance.updateOne(
          { _id: record._id },
          {
            $set: {
              timeIn: correctedTimeIn,
              ...(correctedTimeOut && { timeOut: correctedTimeOut })
            }
          }
        );

        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} records with midnight time-in`);
    
    if (fixes.length > 0) {
      console.log('\n📋 Summary of fixes:');
      fixes.forEach((fix, index) => {
        console.log(`\n${index + 1}. Employee: ${fix.employeeId}`);
        console.log(`   Date: ${fix.date}`);
        console.log(`   Old TimeIn: ${new Date(fix.oldTimeIn).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        console.log(`   New TimeIn: ${new Date(fix.newTimeIn).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        if (fix.oldTimeOut && fix.newTimeOut) {
          console.log(`   Old TimeOut: ${new Date(fix.oldTimeOut).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
          console.log(`   New TimeOut: ${new Date(fix.newTimeOut).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        }
      });
    }

    console.log('\n🎉 Database fix complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing midnight time-in:', error);
    process.exit(1);
  }
}

// Run the fix
fixMidnightTimeIn();
