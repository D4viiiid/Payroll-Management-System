import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Employee from './models/EmployeeModels.js';

dotenv.config({ path: './config.env' });

async function checkAdminPin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admin = await Employee.findOne({ username: 'ADMIN' }).select('+password +adminPin');
    
    if (!admin) {
      console.log('❌ Admin account not found');
      process.exit(1);
    }

    console.log('\n=== ADMIN ACCOUNT IN DATABASE ===');
    console.log('Username:', admin.username);
    console.log('Employee ID:', admin.employeeId);
    console.log('Is Admin:', admin.isAdmin);
    console.log('Password hash:', admin.password ? admin.password.substring(0, 30) + '...' : 'NOT SET');
    console.log('Admin PIN hash:', admin.adminPin ? admin.adminPin.substring(0, 30) + '...' : 'NOT SET');
    console.log('Admin PIN length:', admin.adminPin ? admin.adminPin.length : 0);

    // Test PIN verification
    const testPin = '111111';
    console.log('\n=== PIN VERIFICATION TEST ===');
    console.log('Testing PIN:', testPin);
    
    if (!admin.adminPin) {
      console.log('❌ Admin PIN is NOT SET in database');
    } else {
      const pinMatch = await bcrypt.compare(testPin, admin.adminPin);
      console.log('PIN Match Result:', pinMatch ? '✅ MATCH' : '❌ NO MATCH');
      
      // Try comparing as plain text (in case it's not hashed)
      const plainMatch = testPin === admin.adminPin;
      console.log('Plain Text Match:', plainMatch ? '✅ MATCH' : '❌ NO MATCH');
      
      // Check if PIN looks hashed (bcrypt format)
      const isBcryptHash = admin.adminPin.startsWith('$2a$') || admin.adminPin.startsWith('$2b$');
      console.log('Is Bcrypt Hash:', isBcryptHash ? '✅ YES' : '❌ NO');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdminPin();
