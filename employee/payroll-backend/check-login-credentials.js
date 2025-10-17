/**
 * Check Employee Login Credentials
 * Investigates why login is failing
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function checkLoginCredentials() {
  try {
    console.log('🔍 CHECKING LOGIN CREDENTIALS');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Employee = mongoose.connection.collection('employees');

    // Get employee EMP-4879 (Yushikie Vergara from the logs)
    // Using collection directly to bypass schema's select: false
    const employee = await Employee.findOne({ employeeId: 'EMP-4879' });
    
    if (employee) {
      console.log('📋 EMPLOYEE FOUND:');
      console.log(`   Name: ${employee.firstName} ${employee.lastName}`);
      console.log(`   Employee ID: ${employee.employeeId}`);
      console.log(`   Username: ${employee.username}`);
      console.log(`   Email: ${employee.email}`);
      console.log(`   Is Active: ${employee.isActive}`);
      console.log(`   Password Changed: ${employee.passwordChanged}`);
      console.log('');
      console.log(`   Password (full hash): ${employee.password}`);
      console.log(`   Plain Text Password: ${employee.plainTextPassword || 'NOT STORED'}`);
      console.log('');

      // Test if the password is actually a valid bcrypt hash
      const isBcrypt = employee.password && employee.password.startsWith('$2a$') || employee.password.startsWith('$2b$');
      console.log(`   Is valid bcrypt hash: ${isBcrypt}`);
      
      if (employee.plainTextPassword) {
        console.log('\n🧪 TESTING LOGIN WITH PLAIN TEXT PASSWORD:');
        console.log(`   Plain text password: ${employee.plainTextPassword}`);
        
        try {
          const isMatch = await bcrypt.compare(employee.plainTextPassword, employee.password);
          console.log(`   ✅ Password match result: ${isMatch}`);
        } catch (error) {
          console.log(`   ❌ Error testing password: ${error.message}`);
        }
      }

      // Test with the hash itself (what user is copying)
      console.log('\n🧪 TESTING LOGIN WITH HASH AS PASSWORD (what user is doing):');
      console.log(`   Trying to login with: ${employee.password}`);
      try {
        const isMatch = await bcrypt.compare(employee.password, employee.password);
        console.log(`   ✅ Password match result: ${isMatch}`);
      } catch (error) {
        console.log(`   ❌ Error testing password: ${error.message}`);
      }
    } else {
      console.log('❌ Employee not found');
    }

    console.log('\n============================================================');
    console.log('📊 CHECKING ALL EMPLOYEES WITH CREDENTIALS:');
    console.log('============================================================\n');

    const allEmployees = await Employee.find({
      username: { $exists: true, $ne: null },
      password: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Found ${allEmployees.length} employees with credentials\n`);

    for (const emp of allEmployees.slice(0, 5)) {
      console.log(`👤 ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      console.log(`   Username: ${emp.username}`);
      console.log(`   Password hash: ${emp.password.substring(0, 30)}...`);
      console.log(`   Plain text password: ${emp.plainTextPassword || 'NOT STORED'}`);
      console.log(`   Is Active: ${emp.isActive}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkLoginCredentials();
