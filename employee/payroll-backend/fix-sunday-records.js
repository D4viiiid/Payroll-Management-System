import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employeeDB';

async function fixSundayRecords() {
  try {
    console.log('🔧 Fixing Sunday records in database...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // STEP 1: Fix Attendance - Remove Sunday record
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
    
    console.log('STEP 1: Fixing Attendance Records');
    const sundayAttendances = await Attendance.find({}).lean();
    const sundayAttendanceIds = sundayAttendances
      .filter(record => new Date(record.date).getDay() === 0)
      .map(r => r._id);
    
    if (sundayAttendanceIds.length > 0) {
      const result = await Attendance.deleteMany({ _id: { $in: sundayAttendanceIds } });
      console.log(`   ✅ Deleted ${result.deletedCount} Sunday attendance records`);
    } else {
      console.log('   ✅ No Sunday attendance records to delete');
    }

    // STEP 2: Fix Cash Advance - Move Sunday to Saturday
    const CashAdvance = mongoose.model('CashAdvance', new mongoose.Schema({
      employee: mongoose.Schema.Types.ObjectId,
      requestDate: Date,
      date: Date,
      amount: Number
    }, { strict: false }));
    
    console.log('\nSTEP 2: Fixing Cash Advance Records');
    const cashAdvances = await CashAdvance.find({}).lean();
    let cashAdvanceFixed = 0;
    
    for (const record of cashAdvances) {
      const date = new Date(record.requestDate || record.date);
      if (date.getDay() === 0) { // Sunday
        // Move to previous Saturday
        const saturday = new Date(date);
        saturday.setDate(date.getDate() - 1);
        
        await CashAdvance.updateOne(
          { _id: record._id },
          { $set: { requestDate: saturday } }
        );
        
        console.log(`   ✅ Moved ${date.toLocaleDateString()} (Sun) → ${saturday.toLocaleDateString()} (Sat)`);
        cashAdvanceFixed++;
      }
    }
    
    if (cashAdvanceFixed === 0) {
      console.log('   ✅ No Sunday cash advance records to fix');
    } else {
      console.log(`   ✅ Fixed ${cashAdvanceFixed} cash advance records`);
    }

    // STEP 3: Fix Payroll Records
    const Payroll = mongoose.model('Payroll', new mongoose.Schema({}, { strict: false }));
    
    console.log('\nSTEP 3: Fixing Payroll Records');
    console.log('   Work week should be: Monday - Saturday (6 days)');
    console.log('   Cutoff should be: Sunday');
    
    const payrolls = await Payroll.find({}).lean();
    let payrollFixed = 0;
    
    for (const record of payrolls) {
      let updates = {};
      let needsUpdate = false;
      
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);
      const cutoffDate = record.cutoffDate ? new Date(record.cutoffDate) : null;
      
      // Fix start date if it's Sunday (should be Monday)
      if (startDate.getDay() === 0) {
        const monday = new Date(startDate);
        monday.setDate(startDate.getDate() + 1);
        updates.startDate = monday;
        needsUpdate = true;
      }
      
      // Fix end date if it's Sunday (should be Saturday)
      if (endDate.getDay() === 0) {
        const saturday = new Date(endDate);
        saturday.setDate(endDate.getDate() - 1);
        updates.endDate = saturday;
        needsUpdate = true;
      }
      
      // Fix cutoff date if it's NOT Sunday (should be Sunday)
      if (cutoffDate && cutoffDate.getDay() !== 0) {
        // Find the next Sunday after end date
        const saturday = updates.endDate ? new Date(updates.endDate) : new Date(endDate);
        if (saturday.getDay() === 0) saturday.setDate(saturday.getDate() - 1); // Ensure it's Saturday
        
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1); // Saturday + 1 = Sunday
        updates.cutoffDate = sunday;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await Payroll.updateOne({ _id: record._id }, { $set: updates });
        
        console.log(`   ✅ Fixed ${record.employeeName}:`);
        if (updates.startDate) {
          console.log(`      Start: ${startDate.toLocaleDateString()} → ${updates.startDate.toLocaleDateString()}`);
        }
        if (updates.endDate) {
          console.log(`      End: ${endDate.toLocaleDateString()} → ${updates.endDate.toLocaleDateString()}`);
        }
        if (updates.cutoffDate) {
          console.log(`      Cutoff: ${cutoffDate?.toLocaleDateString() || 'N/A'} → ${updates.cutoffDate.toLocaleDateString()}`);
        }
        payrollFixed++;
      }
    }
    
    if (payrollFixed === 0) {
      console.log('   ✅ All payroll records already correct');
    } else {
      console.log(`   ✅ Fixed ${payrollFixed} payroll records`);
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Attendance: Removed ${sundayAttendanceIds.length} Sunday records`);
    console.log(`   ✅ Cash Advance: Fixed ${cashAdvanceFixed} Sunday dates`);
    console.log(`   ✅ Payroll: Fixed ${payrollFixed} records with date issues`);
    console.log('\n✅ All Sunday issues have been fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixSundayRecords();
