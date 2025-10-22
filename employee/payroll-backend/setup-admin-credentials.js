import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

import Employee from './models/EmployeeModels.js';

async function setupAdminAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin account
    let admin = await Employee.findOne({ isAdmin: true });

    if (!admin) {
      console.log('❌ No admin account found!');
      console.log('Creating new admin account...\n');
      
      // Create new admin
      admin = new Employee({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@payroll.com',
        contactNumber: '0000000000',
        position: 'System Administrator',
        hireDate: new Date(),
        status: 'regular',
        isAdmin: true,
        isActive: true,
        username: 'ADMIN',
        password: 'ADMIN123',
        adminPin: '111111'
      });
      
      await admin.save();
      console.log('✅ New admin account created!');
    } else {
      console.log('📋 Found existing admin account');
      console.log('Updating credentials...\n');
      
      // Update admin credentials
      admin.username = 'ADMIN';
      admin.password = 'ADMIN123'; // Will be hashed by pre-save hook
      admin.adminPin = '111111';   // Will be hashed by pre-save hook
      admin.isAdmin = true;
      admin.isActive = true;
      
      await admin.save();
      console.log('✅ Admin credentials updated!');
    }

    // Verify the update
    const updatedAdmin = await Employee.findOne({ username: 'ADMIN' }).select('+password +adminPin');
    
    console.log('\n📋 Admin Account Details:');
    console.log('   Username:', updatedAdmin.username);
    console.log('   Email:', updatedAdmin.email);
    console.log('   Password Hash:', updatedAdmin.password ? 'SET' : 'NOT SET');
    console.log('   Admin PIN Hash:', updatedAdmin.adminPin ? 'SET' : 'NOT SET');
    console.log('   Is Admin:', updatedAdmin.isAdmin);
    console.log('   Is Active:', updatedAdmin.isActive);
    
    // Test password verification
    console.log('\n🧪 Testing Password Verification:');
    const passwordMatch = await bcrypt.compare('ADMIN123', updatedAdmin.password);
    console.log('   Password "ADMIN123" match:', passwordMatch ? '✅ YES' : '❌ NO');
    
    const pinMatch = await bcrypt.compare('111111', updatedAdmin.adminPin);
    console.log('   PIN "111111" match:', pinMatch ? '✅ YES' : '❌ NO');
    
    console.log('\n✅ Setup complete! You can now login with:');
    console.log('   Username: ADMIN');
    console.log('   Password: ADMIN123');
    console.log('   PIN: 111111');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

setupAdminAccount();
