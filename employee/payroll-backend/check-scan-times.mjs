import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Attendance } from './models/Attendance.model.js';

dotenv.config({ path: 'config.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const records = await Attendance.find().sort({ timeIn: -1 }).limit(10).lean();
  
  console.log('\n=== CHECKING ACTUAL SCAN TIMES ===\n');
  
  records.forEach((r, i) => {
    const timeInObj = new Date(r.timeIn);
    const dateObj = new Date(r.date);
    
    const timeInManila = new Date(timeInObj.getTime() + (8 * 60 * 60 * 1000));
    const dateManila = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
    
    console.log(${i+1}. );
    console.log(   Scanned at: );
    console.log(   Date field: );
    console.log('');
  });
  
  const todayDate = records.filter(r => {
    const dateObj = new Date(r.date);
    const dateManila = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
    return dateManila.toISOString().split('T')[0] === '2025-10-17';
  });
  
  console.log(Records with DATE=Oct 17: );
  todayDate.forEach(r => console.log(   - ));
  
  process.exit(0);
}).catch(err => console.error(err));
