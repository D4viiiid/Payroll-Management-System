/**
 * Setup Admin PIN Script
 * This script creates or updates the admin account with a default PIN: 123456
 * Run this once to initialize the admin PIN
 * 
 * Usage: node setup-admin-pin.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// Employee Schema (simplified - only what we need)
const employeeSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  username: String,
  password: String,
  employeeId: String,
  isAdmin: Boolean,
  isActive: Boolean,
  adminPin: String,
  position: String,
  hireDate: Date,
  passwordChanged: Boolean
});

const Employee = mongoose.model('Employee', employeeSchema);

const setupAdminPin = async () => {
  try {
    await connectDB();

    console.log('\n🔧 Setting up Admin PIN...\n');

    // Find admin account
    let admin = await Employee.findOne({ 
      $or: [{ username: 'admin' }, { isAdmin: true }] 
    });

    if (!admin) {
      console.log('⚠️  No admin account found. Creating new admin account...');
      
      // Create new admin account
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const hashedPin = await bcrypt.hash('123456', 10);
      
      admin = new Employee({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        employeeId: 'ADMIN001',
        isAdmin: true,
        isActive: true,
        adminPin: hashedPin,
        position: 'Administrator',
        hireDate: new Date(),
        passwordChanged: true
      });

      await admin.save();
      console.log('✅ Admin account created successfully!');
      console.log('\n📋 Admin Credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   PIN: 123456');
      console.log('\n⚠️  IMPORTANT: Change these credentials immediately after first login!');
    } else {
      console.log('✅ Admin account found:', admin.username || admin.employeeId);
      
      // Check if PIN is already set
      if (admin.adminPin) {
        console.log('⚠️  Admin already has a PIN configured.');
        console.log('\nDo you want to reset the PIN to default (123456)?');
        console.log('If yes, please uncomment the code below and re-run this script.');
        console.log('\n/* Uncomment to reset PIN:');
        console.log('const hashedPin = await bcrypt.hash("123456", 10);');
        console.log('admin.adminPin = hashedPin;');
        console.log('await admin.save();');
        console.log('*/');
      } else {
        // Set default PIN
        const hashedPin = await bcrypt.hash('123456', 10);
        admin.adminPin = hashedPin;
        await admin.save();
        
        console.log('✅ Admin PIN set successfully!');
        console.log('\n📋 Admin PIN: 123456');
        console.log('\n⚠️  IMPORTANT: Change this PIN immediately using Admin Settings!');
      }
    }

    console.log('\n✅ Admin setup complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up admin PIN:', err);
    process.exit(1);
  }
};

setupAdminPin();
