import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Attendance } from './models/Attendance.model.js';

dotenv.config({ path: 'config.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const records = await Attendance.find().sort({ timeIn: -1 }).limit(6).lean();
  
  console.log('\n=== TIMEZONE CONVERSION TEST ===\n');
  console.log('Testing the CORRECT formula: UTC + 8 hours = Manila\n');
  
  records.forEach((r, i) => {
    const dateObj = new Date(r.date);
    
    // CORRECT: Add 8 hours to UTC to get Manila
    const manilaDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
    const manilaDateStr = manilaDate.toISOString().split('T')[0];
    
    console.log(`${i+1}. ${r.employeeId}`);
    console.log(`   date (UTC): ${dateObj.toISOString()}`);
    console.log(`   date (Manila): ${manilaDateStr}`);
    console.log('');
  });
  
  // Test today filter
  const now = new Date();
  const manilaNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const todayStr = manilaNow.toISOString().split('T')[0];
  
  console.log(`\n📅 TODAY in Manila: ${todayStr}\n`);
  
  const todayRecords = records.filter(r => {
    const dateObj = new Date(r.date);
    const manilaDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
    const recordDateStr = manilaDate.toISOString().split('T')[0];
    return recordDateStr === todayStr;
  });
  
  console.log(`✅ Records matching TODAY (${todayStr}): ${todayRecords.length}`);
  todayRecords.forEach(r => {
    console.log(`   - ${r.employeeId}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
