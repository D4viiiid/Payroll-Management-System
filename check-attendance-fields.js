require('dotenv').config({ path: './employee/payroll-backend/config.env' });
const mongoose = require('mongoose');

async function checkAttendanceFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const attendances = db.collection('attendances');

    // Get a sample attendance record
    const sample = await attendances.findOne(
      { timeOut: { $ne: null } }, // Get a completed attendance
      { sort: { _id: -1 } }
    );

    console.log('\n📋 SAMPLE COMPLETED ATTENDANCE RECORD:');
    console.log('=====================================');
    console.log('Employee:', sample.employee);
    console.log('Date:', sample.date);
    console.log('TimeIn:', sample.timeIn);
    console.log('TimeOut:', sample.timeOut);
    console.log('Status:', sample.status);
    console.log('DayType:', sample.dayType);
    console.log('TimeInStatus:', sample.timeInStatus);
    console.log('=====================================\n');

    // Count by dayType
    const fullDayCount = await attendances.countDocuments({ dayType: 'Full Day' });
    const halfDayCount = await attendances.countDocuments({ dayType: 'Half Day' });
    const overtimeCount = await attendances.countDocuments({ dayType: 'Overtime' });
    const incompleteCount = await attendances.countDocuments({ dayType: 'Incomplete' });

    console.log('📊 ATTENDANCE BY DAYTYPE:');
    console.log('Full Day:', fullDayCount);
    console.log('Half Day:', halfDayCount);
    console.log('Overtime:', overtimeCount);
    console.log('Incomplete:', incompleteCount);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAttendanceFields();
