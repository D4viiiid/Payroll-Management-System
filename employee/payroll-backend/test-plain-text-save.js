import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';

const MONGODB_URI = "mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0";

async function testPlainTextSave() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the test employee we just created (EMP-2931)
    console.log('🔍 Finding employee EMP-2931...');
    const employee = await Employee.findOne({ employeeId: 'EMP-2931' }).select('+plainTextPassword');
    
    if (!employee) {
      console.log('❌ Employee not found');
      process.exit(1);
    }

    console.log('\n📋 Current employee state:');
    console.log('  Employee ID:', employee.employeeId);
    console.log('  Username:', employee.username);
    console.log('  Password (hash):', employee.password?.substring(0, 20) + '...');
    console.log('  plainTextPassword:', employee.plainTextPassword || 'NOT SET');

    // Try to set plainTextPassword directly
    console.log('\n✏️  Setting plainTextPassword to "TestPassword123"...');
    employee.plainTextPassword = 'TestPassword123';
    employee.markModified('plainTextPassword');
    
    console.log('💾 Saving employee...');
    await employee.save();
    console.log('✅ Save completed\n');

    // Query again to verify
    console.log('🔍 Verifying by querying database again...');
    const verifyEmployee = await Employee.findOne({ employeeId: 'EMP-2931' }).select('+plainTextPassword');
    console.log('  plainTextPassword from database:', verifyEmployee.plainTextPassword || 'STILL NOT SET ❌');

    // Try direct update using updateOne
    console.log('\n🔄 Trying direct updateOne...');
    const updateResult = await Employee.updateOne(
      { employeeId: 'EMP-2931' },
      { $set: { plainTextPassword: 'DirectUpdate456' } }
    );
    console.log('  Update result:', updateResult);

    // Verify again
    console.log('🔍 Verifying after updateOne...');
    const verifyEmployee2 = await Employee.findOne({ employeeId: 'EMP-2931' }).select('+plainTextPassword');
    console.log('  plainTextPassword from database:', verifyEmployee2.plainTextPassword || 'STILL NOT SET ❌');

    await mongoose.disconnect();
    console.log('\n✅ Test complete\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testPlainTextSave();
