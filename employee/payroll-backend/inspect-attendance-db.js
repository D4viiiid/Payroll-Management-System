import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function inspectAttendance() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('employee_db');
    
    // Get recent attendance records
    console.log('=== RECENT ATTENDANCE RECORDS ===');
    const recentRecords = await db.collection('attendances')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    recentRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Employee: ${record.employeeId}`);
      console.log(`   Date: ${record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}`);
      console.log(`   Time In: ${record.timeIn ? new Date(record.timeIn).toLocaleString() : 'N/A'}`);
      console.log(`   Time Out: ${record.timeOut ? new Date(record.timeOut).toLocaleString() : 'N/A'}`);
      console.log(`   Day Type: ${record.dayType || 'N/A'}`);
      console.log(`   Status: ${record.status || 'N/A'}`);
      console.log(`   Time In Status: ${record.timeInStatus || 'N/A'}`);
      console.log(`   Hours Worked: ${record.actualHoursWorked || 0}`);
      console.log(`   Total Pay: ${record.totalPay || 0}`);
      console.log(`   Archived: ${record.archived || false}`);
    });
    
    // Check for today's records
    console.log('\n\n=== TODAY\'S RECORDS ===');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayRecords = await db.collection('attendances')
      .find({
        date: { $gte: today, $lt: tomorrow },
        archived: false
      })
      .toArray();
    
    console.log(`Found ${todayRecords.length} records for today (${today.toLocaleDateString()})`);
    
    todayRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.employeeId}`);
      console.log(`   Time In: ${record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : 'N/A'}`);
      console.log(`   Time Out: ${record.timeOut ? new Date(record.timeOut).toLocaleTimeString() : 'Open shift'}`);
      console.log(`   Day Type: ${record.dayType || 'Incomplete'}`);
    });
    
    // Check for open shifts
    console.log('\n\n=== OPEN SHIFTS ===');
    const openShifts = await db.collection('attendances')
      .find({
        timeIn: { $exists: true, $ne: null },
        timeOut: null,
        archived: false
      })
      .toArray();
    
    console.log(`Found ${openShifts.length} open shifts`);
    
    openShifts.forEach((shift, index) => {
      const timeIn = new Date(shift.timeIn);
      const hoursSince = (new Date() - timeIn) / (1000 * 60 * 60);
      console.log(`\n${index + 1}. ${shift.employeeId}`);
      console.log(`   Date: ${shift.date ? new Date(shift.date).toLocaleDateString() : 'N/A'}`);
      console.log(`   Time In: ${timeIn.toLocaleString()}`);
      console.log(`   Hours since: ${hoursSince.toFixed(2)}`);
      console.log(`   Should auto-close: ${hoursSince >= 12 ? '⚠️  YES' : '✅ NO'}`);
    });
    
    // Count statistics
    console.log('\n\n=== DATABASE STATISTICS ===');
    const totalRecords = await db.collection('attendances').countDocuments();
    const archivedRecords = await db.collection('attendances').countDocuments({ archived: true });
    const activeRecords = totalRecords - archivedRecords;
    
    console.log(`Total attendance records: ${totalRecords}`);
    console.log(`Active records: ${activeRecords}`);
    console.log(`Archived records: ${archivedRecords}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

inspectAttendance();
