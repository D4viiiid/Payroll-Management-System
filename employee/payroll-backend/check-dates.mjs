import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Attendance } from './models/Attendance.model.js';

dotenv.config({ path: 'config.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const records = await Attendance.find().sort({ timeIn: -1 }).limit(6).lean();
  
  console.log('\n=== LATEST 6 ATTENDANCE RECORDS ===\n');
  records.forEach((r, i) => {
    const timeIn = new Date(r.timeIn);
    const date = new Date(r.date);
    
    console.log(`${i+1}. ${r.employeeId}`);
    console.log(`   timeIn (raw): ${r.timeIn}`);
    console.log(`   timeIn (UTC): ${timeIn.toISOString()}`);
    console.log(`   date (raw): ${r.date}`);
    console.log(`   date (UTC): ${date.toISOString()}`);
    
    // Manila timezone calculation
    const manilaOffset = 8 * 60; // UTC+8 in minutes
    const utcOffset = date.getTimezoneOffset(); // Server timezone offset
    const manilaDate = new Date(date.getTime() + (manilaOffset + utcOffset) * 60000);
    console.log(`   date (Manila calc): ${manilaDate.toISOString().split('T')[0]}`);
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
