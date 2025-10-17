/**
 * Reset Passwords for Existing Employees
 * Generates new plain text passwords for employees who don't have one stored
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

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function resetPasswords() {
  try {
    console.log('🔄 RESETTING PASSWORDS FOR EXISTING EMPLOYEES');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find employees with username but no plainTextPassword
    const employees = await Employee.find({
      username: { $exists: true, $ne: null },
      $or: [
        { plainTextPassword: { $exists: false } },
        { plainTextPassword: null },
        { plainTextPassword: '' }
      ]
    }).select('+plainTextPassword');

    console.log(`📊 Found ${employees.length} employees needing password reset\n`);

    const passwordResets = [];

    for (const emp of employees) {
      const newPassword = generatePassword();
      
      console.log(`🔑 ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      console.log(`   Username: ${emp.username}`);
      console.log(`   New Password: ${newPassword}`);
      console.log('');

      passwordResets.push({
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        username: emp.username,
        password: newPassword
      });

      // Set both plainTextPassword and password
      // The pre-save hook will hash the password and keep plainTextPassword as-is
      emp.plainTextPassword = newPassword;
      emp.password = newPassword;
      await emp.save();
    }

    console.log('============================================================');
    console.log(`✅ Password reset complete!`);
    console.log(`   Updated: ${employees.length} employees`);
    console.log('============================================================\n');

    console.log('📋 SUMMARY OF NEW CREDENTIALS:\n');
    console.log('Employee ID       | Name                      | Username      | Password');
    console.log('------------------|---------------------------|---------------|------------------');
    passwordResets.forEach(reset => {
      console.log(`${reset.employeeId.padEnd(17)} | ${reset.name.padEnd(25)} | ${reset.username.padEnd(13)} | ${reset.password}`);
    });
    console.log('\n⚠️  IMPORTANT: Save these credentials securely and share with employees!');
    console.log('\n💡 TIP: Employees can now log in with their username and the password shown above.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

resetPasswords();
