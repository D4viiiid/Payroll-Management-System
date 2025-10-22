const mongoose = require('mongoose');
require('dotenv').config({ path: 'config.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Attendance = require('./models/Attendance.model.js');
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
    console.log(`   date (Manila): ${new Date(date.getTime() + (8 * 60 * 60 * 1000)).toISOString()}`);
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
