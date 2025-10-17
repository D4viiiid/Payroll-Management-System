import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employeeDB';

async function findSundayRecords() {
  try {
    console.log('🔍 Searching for Sunday records in database...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check Attendance collection
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    const attendances = await Attendance.find({}).lean();
    
    console.log('📊 ATTENDANCE RECORDS:');
    const sundayAttendances = attendances.filter(record => {
      const date = new Date(record.date);
      return date.getDay() === 0; // Sunday
    });
    
    if (sundayAttendances.length > 0) {
      console.log(`❌ Found ${sundayAttendances.length} Sunday attendance records:`);
      sundayAttendances.forEach(record => {
        const date = new Date(record.date);
        console.log(`   - ${record.employeeName || 'Unknown'} (${record.employeeId}): ${date.toLocaleDateString()}`);
      });
    } else {
      console.log('✅ No Sunday attendance records found');
    }
    
    // Check Cash Advance collection
    const CashAdvance = mongoose.model('CashAdvance', new mongoose.Schema({
      employee: mongoose.Schema.Types.ObjectId,
      requestDate: Date,
      date: Date,
      amount: Number
    }, { strict: false }));
    const Employee = mongoose.model('Employee', new mongoose.Schema({ firstName: String, lastName: String }, { strict: false }));
    const cashAdvances = await CashAdvance.find({}).lean();
    
    console.log('\n💰 CASH ADVANCE RECORDS:');
    const sundayCashAdvances = [];
    
    for (const record of cashAdvances) {
      const date = new Date(record.requestDate || record.date);
      if (date.getDay() === 0) { // Sunday
        let employeeName = 'Unknown';
        if (record.employee) {
          const emp = await Employee.findById(record.employee).lean();
          if (emp) {
            employeeName = `${emp.firstName} ${emp.lastName}`;
          }
        }
        sundayCashAdvances.push({ ...record, employeeName, date });
      }
    }
    
    if (sundayCashAdvances.length > 0) {
      console.log(`❌ Found ${sundayCashAdvances.length} Sunday cash advance records:`);
      sundayCashAdvances.forEach(record => {
        console.log(`   - ${record.employeeName}: ${record.date.toLocaleDateString()} - ₱${record.amount}`);
      });
    } else {
      console.log('✅ No Sunday cash advance records found');
    }
    
    // Check Payroll collection
    const Payroll = mongoose.model('Payroll', new mongoose.Schema({}, { strict: false }));
    const payrolls = await Payroll.find({}).lean();
    
    console.log('\n💼 PAYROLL RECORDS:');
    const sundayPayrolls = payrolls.filter(record => {
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);
      const cutoffDate = new Date(record.cutoffDate);
      
      return startDate.getDay() === 0 || endDate.getDay() === 0 || 
             (cutoffDate && cutoffDate.getDay() !== 0); // Cutoff should be Sunday
    });
    
    if (sundayPayrolls.length > 0) {
      console.log(`⚠️ Found ${sundayPayrolls.length} payroll records with Sunday issues:`);
      sundayPayrolls.forEach(record => {
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const cutoffDate = record.cutoffDate ? new Date(record.cutoffDate) : null;
        
        console.log(`   - ${record.employeeName || 'Unknown'}:`);
        if (startDate.getDay() === 0) {
          console.log(`     ❌ Start date is Sunday: ${startDate.toLocaleDateString()}`);
        }
        if (endDate.getDay() === 0) {
          console.log(`     ❌ End date is Sunday: ${endDate.toLocaleDateString()}`);
        }
        if (cutoffDate && cutoffDate.getDay() !== 0) {
          console.log(`     ⚠️ Cutoff date is NOT Sunday: ${cutoffDate.toLocaleDateString()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][cutoffDate.getDay()]})`);
        }
      });
    } else {
      console.log('✅ All payroll records have correct date ranges');
    }
    
    console.log('\n📋 SUMMARY:');
    console.log(`   Attendance Sunday records: ${sundayAttendances.length}`);
    console.log(`   Cash Advance Sunday records: ${sundayCashAdvances.length}`);
    console.log(`   Payroll Sunday issues: ${sundayPayrolls.length}`);
    
    const totalIssues = sundayAttendances.length + sundayCashAdvances.length + sundayPayrolls.length;
    if (totalIssues === 0) {
      console.log('\n✅ No Sunday issues found in database!');
    } else {
      console.log(`\n⚠️ Total Sunday issues to fix: ${totalIssues}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findSundayRecords();
