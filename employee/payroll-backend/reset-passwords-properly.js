/**
 * Reset Employee Passwords with Plain Text Storage
 * Generates new passwords and stores both hashed and plain text versions
 */

import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

function generateSecurePassword() {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const all = uppercase + lowercase + numbers + special;
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function resetPasswords() {
  try {
    console.log('🔄 RESETTING EMPLOYEE PASSWORDS');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all employees with credentials
    const employees = await Employee.find({
      username: { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${employees.length} employees with usernames\n`);

    const resetResults = [];

    for (const employee of employees) {
      try {
        // Generate new password
        const newPassword = generateSecurePassword();
        
        console.log(`🔄 Resetting password for: ${employee.firstName} ${employee.lastName}`);
        console.log(`   Employee ID: ${employee.employeeId}`);
        console.log(`   Username: ${employee.username}`);
        console.log(`   New Password: ${newPassword}`);
        
        // Set the new password (this will trigger the pre-save hook)
        employee.password = newPassword;
        employee.passwordChanged = false; // Require password change on first login
        
        // Save the employee (this triggers the pre-save hook which stores plainTextPassword)
        await employee.save();
        
        console.log(`   ✅ Password reset successfully\n`);
        
        resetResults.push({
          employeeId: employee.employeeId,
          username: employee.username,
          name: `${employee.firstName} ${employee.lastName}`,
          password: newPassword
        });
        
      } catch (error) {
        console.error(`   ❌ Error resetting password for ${employee.employeeId}:`, error.message, '\n');
      }
    }

    console.log('\n============================================================');
    console.log('📋 PASSWORD RESET SUMMARY');
    console.log('============================================================\n');

    console.log('Copy these credentials for testing:\n');
    resetResults.forEach(result => {
      console.log(`${result.name} (${result.employeeId})`);
      console.log(`  Username: ${result.username}`);
      console.log(`  Password: ${result.password}`);
      console.log('');
    });

    console.log('============================================================');
    console.log(`✅ Successfully reset ${resetResults.length} passwords`);
    console.log('============================================================\n');

    // Verify one employee has plainTextPassword stored
    console.log('🔍 VERIFYING PLAIN TEXT PASSWORD STORAGE:');
    const verifyEmployee = await Employee.findOne({ employeeId: employees[0].employeeId }).select('+plainTextPassword');
    console.log(`   Employee: ${verifyEmployee.firstName} ${verifyEmployee.lastName}`);
    console.log(`   Plain Text Password: ${verifyEmployee.plainTextPassword || 'NOT STORED'}`);
    console.log(`   Password Hash: ${verifyEmployee.password.substring(0, 30)}...\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

resetPasswords();
