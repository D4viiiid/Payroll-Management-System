import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Employee from '../models/EmployeeModels.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../config.env') });

/**
 * 🔧 FIX ADMIN USER - Set isAdmin flag to true
 */

const fixAdminUser = async () => {
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

    console.log('👤 Current Admin Status:');
    console.log('   Username:', admin.username);
    console.log('   Employee ID:', admin.employeeId);
    console.log('   isAdmin (current):', admin.isAdmin);

    // Update isAdmin flag
    admin.isAdmin = true;
    await admin.save();

    console.log('\n✅ Admin flag updated!');
    console.log('   isAdmin (new):', admin.isAdmin);

    // Verify the update
    const updatedAdmin = await Employee.findOne({ username: 'admin' });
    console.log('\n🔍 Verification:');
    console.log('   isAdmin in database:', updatedAdmin.isAdmin);

    console.log('\n🎉 Admin user fixed successfully!');
    console.log('\n⚠️  IMPORTANT: Logout and login again to get a new token with isAdmin=true!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixAdminUser();
