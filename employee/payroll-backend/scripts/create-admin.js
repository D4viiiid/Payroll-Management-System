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
 * 👤 CREATE ADMIN USER
 * Creates or updates the admin user in the database
 */

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Check if admin already exists
    let admin = await Employee.findOne({ username: 'admin' });

    if (admin) {
      console.log('👤 Admin user already exists');
      console.log('   Username:', admin.username);
      console.log('   Employee ID:', admin.employeeId);
      console.log('   Is Admin:', admin.isAdmin);
      
      // Update admin flag if needed
      if (!admin.isAdmin) {
        admin.isAdmin = true;
        await admin.save();
        console.log('✅ Admin flag updated');
      }
    } else {
      console.log('👤 Creating new admin user...');
      
      admin = new Employee({
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@company.com',
        contactNumber: '09123456789',
        username: 'admin',
        password: 'admin123', // Will be hashed by pre-save hook
        employeeId: 'ADMIN-001',
        position: 'System Administrator',
        department: 'IT',
        status: 'regular',
        hireDate: new Date(),
        isAdmin: true,
        isActive: true,
        passwordChanged: true // Admin already has proper password
      });

      await admin.save();
      console.log('✅ Admin user created successfully');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Employee ID:', admin.employeeId);
    }

    console.log('\n🎉 Admin setup complete!');
    console.log('\n📝 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
