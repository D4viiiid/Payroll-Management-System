import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function testProfilePictureUpdate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const employeeId = 'EMP-9080';
    
    // First, check current state
    console.log('📋 BEFORE UPDATE:');
    let employee = await Employee.findOne({ employeeId }).select('+profilePicture');
    const empObj = employee.toObject();
    console.log(`  Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`  Raw employee object keys:`, Object.keys(empObj));
    console.log(`  profilePicture in object:`, empObj.profilePicture);
    console.log(`  typeof profilePicture:`, typeof empObj.profilePicture);
    console.log(`  Has profilePicture field: ${employee.profilePicture !== undefined}`);
    console.log(`  profilePicture value: ${employee.profilePicture || 'NULL/UNDEFINED'}\n`);

    // Update with a test base64 image (1x1 red pixel)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    console.log('🔄 METHOD 1: Using .save()...');
    employee.profilePicture = testImageBase64;
    await employee.save();
    console.log('✅ Save completed\n');

    // Try Method 2: findOneAndUpdate
    console.log('🔄 METHOD 2: Using findOneAndUpdate...');
    await Employee.findOneAndUpdate(
      { employeeId },
      { $set: { profilePicture: testImageBase64 } },
      { new: true, runValidators: true }
    );
    console.log('✅ Update completed\n');

    // Verify update
    console.log('📋 AFTER UPDATE:');
    employee = await Employee.findOne({ employeeId }).select('+profilePicture');
    const empObj2 = employee.toObject();
    console.log(`  profilePicture in object: ${empObj2.profilePicture ? 'EXISTS' : 'NULL'}`);
    console.log(`  profilePicture length: ${empObj2.profilePicture?.length || 0} chars\n`);

    if (empObj2.profilePicture) {
      console.log('✅ SUCCESS: Profile picture saved to database!');
    } else {
      console.log('❌ FAILED: Profile picture not saved!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testProfilePictureUpdate();
