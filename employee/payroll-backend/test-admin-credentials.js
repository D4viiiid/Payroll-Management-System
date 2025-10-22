// Test admin credentials and PIN after update
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Employee from './models/EmployeeModels.js';

dotenv.config({ path: './config.env' });

async function testAdminCredentials() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin account
    const admin = await Employee.findOne({ 
      employeeId: 'ADMIN001',
      isAdmin: true 
    }).select('+password +adminPin');

    if (!admin) {
      console.log('❌ Admin account not found');
      process.exit(1);
    }

    console.log('📋 Admin Account Details:');
    console.log('=' .repeat(60));
    console.log('Employee ID:', admin.employeeId);
    console.log('Username:', admin.username);
    console.log('First Name:', admin.firstName);
    console.log('Last Name:', admin.lastName);
    console.log('Email:', admin.email);
    console.log('Contact:', admin.contactNumber);
    console.log('Is Admin:', admin.isAdmin);
    console.log('Is Active:', admin.isActive);
    console.log('\n🔐 Security Details:');
    console.log('Password Hash:', admin.password ? admin.password.substring(0, 30) + '...' : 'NOT SET');
    console.log('Admin PIN Hash:', admin.adminPin ? admin.adminPin.substring(0, 30) + '...' : 'NOT SET');
    console.log('Password Changed:', admin.passwordChanged);
    console.log('\n📅 Timestamps:');
    console.log('Created At:', admin.createdAt);
    console.log('Updated At:', admin.updatedAt);
    console.log('Last Login:', admin.lastLogin);
    console.log('=' .repeat(60));

    // Test password verification
    console.log('\n🧪 Testing Password Verification:');
    const testPassword = 'Admin12345';
    const isPasswordValid = await admin.comparePassword(testPassword);
    console.log(`Password "${testPassword}":`, isPasswordValid ? '✅ VALID' : '❌ INVALID');

    // Test PIN verification
    console.log('\n🧪 Testing PIN Verification:');
    const testPin = '111111';
    
    if (admin.adminPin) {
      const isPinValid = await bcrypt.compare(testPin, admin.adminPin);
      console.log(`PIN "${testPin}":`, isPinValid ? '✅ VALID' : '❌ INVALID');
    } else {
      console.log('⚠️  Admin PIN not configured');
    }

    await mongoose.connection.close();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAdminCredentials();
