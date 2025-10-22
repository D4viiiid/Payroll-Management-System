import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Employee from '../models/EmployeeModels.js';
import jwt from 'jsonwebtoken';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../config.env') });

/**
 * 🧪 TEST ADMIN LOGIN AND TOKEN GENERATION
 */

const testAdminLogin = async () => {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // Find admin user
    const admin = await Employee.findOne({ username: 'admin' });

    if (!admin) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    console.log('👤 Admin User Found:');
    console.log('   Username:', admin.username);
    console.log('   Employee ID:', admin.employeeId);
    console.log('   Is Admin:', admin.isAdmin);
    console.log('   Password Hash:', admin.password.substring(0, 20) + '...');

    // Test password verification
    console.log('\n🔐 Testing Password Verification...');
    const isValid = await admin.comparePassword('admin123');
    console.log('   Password "admin123" valid:', isValid);

    if (!isValid) {
      console.log('❌ Password verification failed!');
      process.exit(1);
    }

    // Test token generation
    console.log('\n🎟️  Generating JWT Token...');
    const token = jwt.sign(
      { 
        id: admin._id, 
        employeeId: admin.employeeId,
        username: admin.username,
        isAdmin: admin.isAdmin || false
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    console.log('   Token generated:', token.substring(0, 50) + '...');
    console.log('   Token length:', token.length, 'characters');

    // Verify token
    console.log('\n✅ Verifying JWT Token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('   Decoded payload:', {
      id: decoded.id,
      username: decoded.username,
      isAdmin: decoded.isAdmin
    });

    console.log('\n🎉 All tests passed!');
    console.log('\n📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n⚠️  IMPORTANT: You MUST logout and login again to get a new token!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

testAdminLogin();
