import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false, collection: 'attendances' }));

async function fixTimeInIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all records where timeIn hour is 1 (1:31 AM UTC)
    const allRecords = await Attendance.find({ 
      timeIn: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`📊 Total attendance records: ${allRecords.length}`);
    
    const recordsWithIssue = allRecords.filter(r => {
      const timeIn = new Date(r.timeIn);
      return timeIn.getHours() === 1 && timeIn.getMinutes() === 31;
    });
    
    console.log(`🔍 Found ${recordsWithIssue.length} records with 1:31 AM timeIn\n`);
    
    if (recordsWithIssue.length === 0) {
      console.log('✅ No records need fixing!');
      process.exit(0);
    }
    
    console.log('📋 Records to fix:');
    recordsWithIssue.forEach((r, index) => {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      console.log(`   ${index + 1}. ${r.employeeId} - ${dateStr} - TimeIn: ${r.timeIn}`);
    });
    
    console.log('\n🔧 Starting fix...\n');
    
    let fixedCount = 0;
    
    for (const record of recordsWithIssue) {
      const oldTimeIn = new Date(record.timeIn);
      const oldTimeOut = record.timeOut ? new Date(record.timeOut) : null;
      
      // Change 1:31 AM to 9:31 AM (add 8 hours)
      const newTimeIn = new Date(oldTimeIn);
      newTimeIn.setHours(newTimeIn.getHours() + 8);
      
      // Adjust timeOut to maintain same work duration
      let newTimeOut = null;
      if (oldTimeOut) {
        const hoursDiff = (oldTimeOut - oldTimeIn) / (1000 * 60 * 60);
        newTimeOut = new Date(newTimeIn);
        newTimeOut.setHours(newTimeOut.getHours() + hoursDiff);
      }
      
      // Update the record
      const updateData = { timeIn: newTimeIn };
      if (newTimeOut) {
        updateData.timeOut = newTimeOut;
      }
      
      await Attendance.updateOne(
        { _id: record._id },
        { $set: updateData }
      );
      
      console.log(`✅ Fixed ${record.employeeId}:`);
      console.log(`   TimeIn: ${oldTimeIn.toISOString()} → ${newTimeIn.toISOString()}`);
      if (newTimeOut) {
        console.log(`   TimeOut: ${oldTimeOut.toISOString()} → ${newTimeOut.toISOString()}`);
      }
      console.log('');
      
      fixedCount++;
    }
    
    console.log(`\n✅ Successfully fixed ${fixedCount} records!`);
    console.log('All 1:31 AM times converted to 9:31 AM\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTimeInIssue();
