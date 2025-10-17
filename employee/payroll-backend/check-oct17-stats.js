import mongoose from 'mongoose';
import Attendance from './models/AttendanceModels.js';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkOct17Stats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Oct 17, 2025 date range
    const oct17Start = new Date('2025-10-17T00:00:00+08:00');
    const oct17End = new Date('2025-10-17T23:59:59+08:00');

    console.log('\n📊 Checking Oct 17, 2025 Attendance Records...');
    console.log('Date range:', oct17Start, 'to', oct17End);

    const records = await Attendance.find({
      date: { $gte: oct17Start, $lte: oct17End },
      archived: false
    }).sort({ timeIn: -1 });

    console.log(`\n Found ${records.length} records for Oct 17, 2025\n`);

    let present = 0;
    let fullDay = 0;
    let halfDay = 0;
    let incomplete = 0;
    let totalAttended = 0;

    records.forEach((record, index) => {
      console.log(`\n${index + 1}. Employee: ${record.employeeId}`);
      console.log(`   TimeIn: ${record.timeIn}`);
      console.log(`   TimeOut: ${record.timeOut || 'NOT YET'}`);
      console.log(`   DayType: ${record.dayType || 'NOT SET'}`);
      console.log(`   Status: ${record.status}`);

      if (record.timeIn) {
        totalAttended++;

        if (record.timeOut) {
          if (record.dayType) {
            if (record.dayType === 'Full Day') {
              fullDay++;
            } else if (record.dayType === 'Half Day') {
              halfDay++;
            } else if (record.dayType === 'Incomplete') {
              incomplete++;
            }
          } else {
            // Fallback calculation
            const timeOutHour = new Date(record.timeOut).getHours();
            if (timeOutHour >= 17) {
              fullDay++;
              console.log(`   ⚠️ No dayType - fallback to Full Day based on timeout hour`);
            } else {
              halfDay++;
              console.log(`   ⚠️ No dayType - fallback to Half Day based on timeout hour`);
            }
          }
        } else {
          present++;
        }
      }
    });

    const totalEmployees = await Employee.countDocuments();
    const absent = totalEmployees - totalAttended;

    console.log('\n\n===== STATISTICS SUMMARY =====');
    console.log(`Total Employees: ${totalEmployees}`);
    console.log(`Total Attended: ${totalAttended}`);
    console.log(`Present (no timeout): ${present}`);
    console.log(`Full Day: ${fullDay}`);
    console.log(`Half Day: ${halfDay}`);
    console.log(`Incomplete: ${incomplete}`);
    console.log(`Absent: ${absent}`);
    console.log('==============================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOct17Stats();
