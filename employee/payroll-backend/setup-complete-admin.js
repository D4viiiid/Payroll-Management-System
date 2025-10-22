import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

import Employee from './models/EmployeeModels.js';

async function setupCompleteAdmin() {
  try {
    console.log('🔧 Setting up complete admin account...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find or create admin
    let admin = await Employee.findOne({ 
      $or: [
        { username: 'admin' },
        { isAdmin: true },
        { employeeId: 'ADMIN001' }
      ]
    }).select('+password adminPin');

    if (!admin) {
      console.log('📝 Creating new admin account...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      admin = new Employee({
        employeeId: 'ADMIN001',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@company.com',
        contactNumber: '0000000000',
        position: 'System Administrator',
        hireDate: new Date(),
        username: 'admin',
        password: hashedPassword,
        isAdmin: true,
        isActive: true,
        status: 'regular'
      });
      
      await admin.save();
      console.log('✅ New admin account created\n');
    } else {
      console.log(`📋 Found existing admin: ${admin._id}\n`);
      
      // Update missing fields
      let updated = false;
      
      if (!admin.username) {
        admin.username = 'admin';
        updated = true;
        console.log('✏️  Set username: admin');
      }
      
      if (!admin.password) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        admin.password = hashedPassword;
        updated = true;
        console.log('✏️  Set password: admin123');
      }
      
      if (!admin.employeeId) {
        admin.employeeId = 'ADMIN001';
        updated = true;
        console.log('✏️  Set employeeId: ADMIN001');
      }
      
      if (!admin.firstName) {
        admin.firstName = 'System';
        updated = true;
        console.log('✏️  Set firstName: System');
      }
      
      if (!admin.lastName) {
        admin.lastName = 'Administrator';
        updated = true;
        console.log('✏️  Set lastName: Administrator');
      }
      
      if (!admin.email) {
        admin.email = 'admin@company.com';
        updated = true;
        console.log('✏️  Set email: admin@company.com');
      }
      
      if (!admin.contactNumber) {
        admin.contactNumber = '0000000000';
        updated = true;
        console.log('✏️  Set contactNumber: 0000000000');
      }
      
      if (!admin.position) {
        admin.position = 'System Administrator';
        updated = true;
        console.log('✏️  Set position: System Administrator');
      }
      
      if (!admin.hireDate) {
        admin.hireDate = new Date();
        updated = true;
        console.log('✏️  Set hireDate');
      }
      
      if (!admin.isAdmin) {
        admin.isAdmin = true;
        updated = true;
        console.log('✏️  Set isAdmin: true');
      }
      
      if (!admin.isActive) {
        admin.isActive = true;
        updated = true;
        console.log('✏️  Set isActive: true');
      }
      
      if (updated) {
        await admin.save();
        console.log('\n✅ Admin account updated\n');
      } else {
        console.log('\n✅ Admin account already complete\n');
      }
    }

    // Set admin PIN if not set
    if (!admin.adminPin) {
      console.log('🔐 Setting admin PIN...');
      const hashedPin = await bcrypt.hash('123456', 10);
      admin.adminPin = hashedPin;
      await admin.save();
      console.log('✅ Admin PIN set to: 123456\n');
    } else {
      console.log('✅ Admin PIN already set\n');
    }

    // Verify final state
    const finalAdmin = await Employee.findOne({ username: 'admin' })
      .select('+password adminPin');

    console.log('═══════════════════════════════════════════');
    console.log('✅ ADMIN ACCOUNT READY');
    console.log('═══════════════════════════════════════════');
    console.log('📋 Details:');
    console.log(`   ID: ${finalAdmin._id}`);
    console.log(`   Employee ID: ${finalAdmin.employeeId}`);
    console.log(`   Username: ${finalAdmin.username}`);
    console.log(`   Name: ${finalAdmin.firstName} ${finalAdmin.lastName}`);
    console.log(`   Email: ${finalAdmin.email}`);
    console.log(`   Position: ${finalAdmin.position}`);
    console.log(`   Is Admin: ${finalAdmin.isAdmin}`);
    console.log(`   Is Active: ${finalAdmin.isActive}`);
    console.log(`   Password: ${finalAdmin.password ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log(`   Admin PIN: ${finalAdmin.adminPin ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   PIN: 123456');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

setupCompleteAdmin();
