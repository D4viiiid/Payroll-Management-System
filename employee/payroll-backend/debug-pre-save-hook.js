/**
 * Debug Pre-Save Hook
 * Tests if the pre-save hook is actually being triggered and saving plainTextPassword
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

// Clear Mongoose model cache to ensure we get the latest model
delete mongoose.connection.models['Employee'];
delete mongoose.models['Employee'];

console.log('📦 Importing Employee model from:', path.join(__dirname, 'models', 'EmployeeModels.js'));

// Force reload the module by adding a timestamp query parameter
const timestamp = Date.now();
const { default: Employee } = await import(`./models/EmployeeModels.js?t=${timestamp}`);

console.log('✅ Employee model imported');
console.log('   Model name:', Employee.modelName);
console.log('   Collection name:', Employee.collection.collectionName);
console.log('   Has pre-save hooks:', Employee.schema._pres?.get('save')?.length || 0);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function debugPreSaveHook() {
  try {
    console.log('🐛 DEBUGGING PRE-SAVE HOOK');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get one employee
    const employee = await Employee.findOne({ employeeId: 'EMP-4879' });
    
    if (!employee) {
      console.log('❌ Employee not found');
      return;
    }

    console.log(`📋 Testing with: ${employee.firstName} ${employee.lastName}`);
    console.log(`   Current password hash: ${employee.password.substring(0, 30)}...`);
    console.log('');

    // Set a new password
    const testPassword = 'TestPassword123!';
    console.log(`🔧 Setting new password: ${testPassword}`);
    employee.password = testPassword;

    console.log(`   Before save - password field: ${employee.password}`);
    console.log(`   Before save - plainTextPassword field: ${employee.plainTextPassword || 'undefined'}`);
    console.log('');

    // Save the employee
    console.log('💾 Saving employee...');
    console.log('   isModified("password"):', employee.isModified('password'));
    console.log('   isModified("plainTextPassword"):', employee.isModified('plainTextPassword'));
    console.log('   modifiedPaths():', employee.modifiedPaths());
    const savedEmployee = await employee.save();

    console.log('✅ Employee saved successfully');
    console.log(`   After save - password field: ${savedEmployee.password.substring(0, 30)}...`);
    console.log(`   After save - plainTextPassword field: ${savedEmployee.plainTextPassword || 'undefined'}`);
    console.log('');

    // Query the database directly to see what was actually saved
    console.log('🔍 Querying database directly to verify...');
    const dbDoc = await mongoose.connection.collection('employees').findOne({ _id: employee._id });
    console.log(`   Database - password field: ${dbDoc.password.substring(0, 30)}...`);
    console.log(`   Database - plainTextPassword field: ${dbDoc.plainTextPassword || 'FIELD DOES NOT EXIST'}`);
    console.log('');

    // Query using Mongoose with +plainTextPassword
    console.log('🔍 Querying with Mongoose +plainTextPassword...');
    const mongooseDoc = await Employee.findById(employee._id).select('+plainTextPassword');
    console.log(`   Mongoose - password field: ${mongooseDoc.password.substring(0, 30)}...`);
    console.log(`   Mongoose - plainTextPassword field: ${mongooseDoc.plainTextPassword || 'FIELD DOES NOT EXIST'}`);
    console.log('');

    console.log('============================================================');
    console.log('🧪 TEST LOGIN WITH NEW PASSWORD:');
    console.log('============================================================\n');
    
    const isValid = await mongooseDoc.comparePassword(testPassword);
    console.log(`Password: ${testPassword}`);
    console.log(`Match result: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

debugPreSaveHook();
