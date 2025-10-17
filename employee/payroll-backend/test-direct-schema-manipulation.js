/**
 * Test Direct Schema Manipulation
 * Try to manually add the pre-save hook to the existing model
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function testDirectSchemaManipulation() {
  try {
    console.log('🔧 TESTING DIRECT SCHEMA MANIPULATION');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import the model
    const { default: Employee } = await import('./models/EmployeeModels.js');
    
    console.log('📊 Current model info:');
    console.log('   Model name:', Employee.modelName);
    console.log('   Pre-save hooks:', Employee.schema._pres?.get('save')?.length || 0);
    console.log('');

    // Manually add a pre-save hook to the schema
    console.log('🔧 Manually adding pre-save hook to schema...');
    Employee.schema.pre('save', async function(next) {
      console.log('[MANUAL PRE-SAVE] Hook triggered!');
      if (!this.isModified('password') || !this.password) return next();
      
      if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
        this.plainTextPassword = this.password;
        console.log('[MANUAL PRE-SAVE] Stored plainTextPassword:', this.plainTextPassword);
      }
      
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash(this.password, 12);
      this.password = hashedPassword;
      next();
    });

    console.log('✅ Pre-save hook added');
    console.log('   Pre-save hooks now:', Employee.schema._pres?.get('save')?.length || 0);
    console.log('');

    // Test it
    console.log('🧪 Testing with employee...');
    const employee = await Employee.findOne({ employeeId: 'EMP-4879' });
    
    const testPassword = 'TestManual123!';
    console.log(`   Setting password: ${testPassword}`);
    employee.password = testPassword;
    
    await employee.save();
    console.log('✅ Saved successfully');
    
    // Verify
    const dbDoc = await mongoose.connection.collection('employees').findOne({ _id: employee._id });
    console.log(`   Database - plainTextPassword: ${dbDoc.plainTextPassword || 'NOT STORED'}`);
    
    // Test login
    const isValid = await employee.comparePassword(testPassword);
    console.log(`   Login test: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testDirectSchemaManipulation();
