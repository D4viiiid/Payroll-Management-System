import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false, collection: 'attendances' }));

async function checkAttendanceTimes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check EMP-1480 records
    const records = await Attendance.find({ employeeId: 'EMP-1480' })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    
    console.log(`\n📊 Found ${records.length} records for EMP-1480:\n`);
    
    records.forEach((r, index) => {
      const timeIn = new Date(r.timeIn);
      const timeOut = r.timeOut ? new Date(r.timeOut) : null;
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      
      console.log(`${index + 1}. Date: ${dateStr}`);
      console.log(`   TimeIn: ${r.timeIn} (Local Hour: ${timeIn.getHours()}:${timeIn.getMinutes()})`);
      console.log(`   TimeOut: ${r.timeOut || 'N/A'} ${timeOut ? `(Local Hour: ${timeOut.getHours()}:${timeOut.getMinutes()})` : ''}`);
      console.log(`   Status: ${r.status}, DayType: ${r.dayType}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAttendanceTimes();
