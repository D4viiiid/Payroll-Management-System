import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

async function testTodayAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Get current date info
    console.log('\n📅 Date Information:');
    console.log('Server time (UTC):', new Date().toISOString());
    console.log('Server time (Local):', new Date().toString());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('Today range:', today.toISOString(), 'to', tomorrow.toISOString());
    
    // Get all attendance records
    const allAttendances = await db.collection('attendances').find({}).sort({date: -1}).limit(5).toArray();
    console.log('\n📊 Most Recent Attendance Records:', allAttendances.length);
    allAttendances.forEach((a, i) => {
      console.log(`${i+1}. ${a.employeeId}:`);
      console.log(`   Date: ${a.date}`);
      console.log(`   TimeIn: ${a.timeIn}`);
      console.log(`   TimeOut: ${a.timeOut}`);
      console.log(`   Status: ${a.status}`);
    });
    
    // Get today's records using the stats logic
    const todayRecords = await db.collection('attendances').find({
      date: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    console.log('\n📊 Today\'s Attendance Records:', todayRecords.length);
    todayRecords.forEach((a, i) => {
      console.log(`${i+1}. ${a.employeeId}:`);
      console.log(`   TimeIn: ${a.timeIn}`);
      console.log(`   TimeOut: ${a.timeOut}`);
    });
    
    // Count employees
    const totalEmployees = await db.collection('employees').countDocuments();
    console.log('\n👥 Total Employees:', totalEmployees);
    
    // Calculate stats
    let presentToday = 0;
    let fullDay = 0;
    let halfDay = 0;
    
    todayRecords.forEach(record => {
      if (record.timeIn) {
        if (record.timeOut) {
          fullDay++;
        } else {
          presentToday++;
        }
        if (record.status === 'half-day') {
          halfDay++;
        }
      }
    });
    
    const absent = totalEmployees - (presentToday + fullDay);
    
    console.log('\n📈 Stats:');
    console.log('  Present (with timeIn, no timeOut):', presentToday);
    console.log('  Full Day (with both timeIn and timeOut):', fullDay);
    console.log('  Half Day:', halfDay);
    console.log('  Absent:', absent);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testTodayAttendance();
