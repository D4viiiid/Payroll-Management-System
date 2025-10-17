import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const checkProfilePicture = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find EMP-9080
    const employee = await Employee.findOne({ employeeId: 'EMP-9080' });
    
    if (!employee) {
      console.log('❌ EMP-9080 not found');
      process.exit(1);
    }

    console.log('📋 Employee Info:');
    console.log(`  ID: ${employee.employeeId}`);
    console.log(`  Name: ${employee.firstName} ${employee.lastName}`);
    console.log(`  Has profilePicture field: ${employee.profilePicture !== undefined}`);
    console.log(`  profilePicture is null: ${employee.profilePicture === null}`);
    console.log(`  profilePicture length: ${employee.profilePicture ? employee.profilePicture.length : 0} chars`);
    
    if (employee.profilePicture) {
      console.log(`  profilePicture preview: ${employee.profilePicture.substring(0, 50)}...`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkProfilePicture();
