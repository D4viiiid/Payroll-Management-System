/**
 * 🧪 Admin Login Flow Test
 * Tests the complete admin login process including PIN verification
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// Import Employee model
import Employee from './models/EmployeeModels.js';

async function testAdminLoginFlow() {
  try {
    console.log('🧪 Starting Admin Login Flow Test...\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Find admin account
    console.log('Test 1: Finding admin account...');
    const admin = await Employee.findOne({ 
      employeeId: 'ADMIN001',
      isAdmin: true,
      isActive: true
    }).select('+password +adminPin');

    if (!admin) {
      console.log('❌ Admin account not found!');
      process.exit(1);
    }
    console.log(`✅ Admin found: ${admin.username} (${admin.employeeId})\n`);

    // Test 2: Verify password
    console.log('Test 2: Testing password verification...');
    const testPassword = 'Admin12345';
    const isPasswordValid = await admin.comparePassword(testPassword);
    
    if (!isPasswordValid) {
      console.log('❌ Password verification failed!');
      console.log('   Tried password:', testPassword);
      process.exit(1);
    }
    console.log(`✅ Password verified successfully\n`);

    // Test 3: Check PIN setup
    console.log('Test 3: Checking PIN setup...');
    if (!admin.adminPin) {
      console.log('❌ Admin PIN not configured!');
      process.exit(1);
    }
    console.log(`✅ Admin PIN is configured\n`);

    // Test 4: Verify PIN
    console.log('Test 4: Testing PIN verification...');
    const testPin = '111111';
    const isPinValid = await bcrypt.compare(testPin, admin.adminPin);
    
    if (!isPinValid) {
      console.log('❌ PIN verification failed!');
      console.log('   Expected PIN:', testPin);
      process.exit(1);
    }
    console.log(`✅ PIN verified successfully\n`);

    // Test 5: Verify admin privileges
    console.log('Test 5: Verifying admin privileges...');
    if (!admin.isAdmin) {
      console.log('❌ User is not admin!');
      process.exit(1);
    }
    console.log(`✅ Admin privileges confirmed\n`);

    // Test 6: Verify account is active
    console.log('Test 6: Verifying account status...');
    if (!admin.isActive) {
      console.log('❌ Account is inactive!');
      process.exit(1);
    }
    console.log(`✅ Account is active\n`);

    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📋 NEW Login Credentials:');
    console.log('   Username: ADMIN');
    console.log('   Password: Admin12345');
    console.log('   PIN: 111111');
    console.log('\n🌐 Test the login flow at: http://localhost:5174');
    console.log('\n✨ Expected behavior:');
    console.log('   1. Enter username: ADMIN');
    console.log('   2. Enter password: Admin12345');
    console.log('   3. Click Login');
    console.log('   4. PIN overlay appears');
    console.log('   5. Enter 6-digit PIN: 111111');
    console.log('   6. ONE success toast appears');
    console.log('   7. Redirected to dashboard within 1 second');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

testAdminLoginFlow();
