import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

async function checkAttendanceRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Get all attendance records for Gabriel
    const records = await db.collection('attendances').find({ 
      employeeId: 'EMP-7479' 
    }).sort({date: -1}).toArray();
    
    console.log(`📊 Total attendance records for Gabriel: ${records.length}\n`);
    
    records.forEach((r, i) => {
      console.log(`Record ${i+1}:`);
      console.log(`  _id: ${r._id}`);
      console.log(`  Date: ${r.date}`);
      console.log(`  TimeIn: ${r.timeIn}`);
      console.log(`  TimeOut: ${r.timeOut}`);
      console.log(`  Status: ${r.status}`);
      console.log('');
    });
    
    // Check today's records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayRecords = await db.collection('attendances').find({
      employeeId: 'EMP-7479',
      date: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    console.log(`📅 Today's records: ${todayRecords.length}`);
    todayRecords.forEach((r, i) => {
      console.log(`  ${i+1}. TimeIn: ${r.timeIn}, TimeOut: ${r.timeOut}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAttendanceRecords();
