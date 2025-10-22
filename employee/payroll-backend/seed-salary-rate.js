import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'config.env') });

import SalaryRate from './models/SalaryRate.model.js';
import Employee from './models/EmployeeModels.js';

async function seedSalaryRate() {
  try {
    console.log('🌱 Starting salary rate seed process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    // Find any employee to set as creator (preferably with username 'admin' or 'superadmin')
    let admin = await Employee.findOne({ username: { $in: ['admin', 'superadmin', 'administrator'] } });
    
    if (!admin) {
      // If no admin username, just get the first employee
      admin = await Employee.findOne({});
    }
    
    if (!admin) {
      console.error('❌ No employees found in database');
      console.log('   Please create at least one employee first');
      process.exit(1);
    }
    
    console.log(`✅ Found admin user: ${admin.firstName} ${admin.lastName}`);
    
    // Check if rate already exists
    const existing = await SalaryRate.findOne({});
    
    if (existing) {
      console.log('⚠️  Salary rate already exists in database:');
      console.log(`   Daily Rate: ₱${existing.dailyRate}`);
      console.log(`   Hourly Rate: ₱${existing.hourlyRate}`);
      console.log(`   Overtime Rate: ₱${existing.overtimeRate}`);
      console.log(`   Effective Date: ${existing.effectiveDate}`);
      console.log(`   Is Active: ${existing.isActive}`);
      console.log('');
      console.log('✅ Seed process complete (no changes needed)');
      process.exit(0);
    }
    
    // Create initial rate
    const rate = new SalaryRate({
      dailyRate: 550,
      effectiveDate: new Date('2025-01-01'),
      createdBy: admin._id,
      createdByName: `${admin.firstName} ${admin.lastName}`,
      reason: 'Initial system rate',
      notes: 'Default rate at system launch - January 2025',
      isActive: true
    });
    
    await rate.save();
    
    console.log('✅ Initial salary rate created successfully!');
    console.log('');
    console.log('📊 Rate Details:');
    console.log(`   Daily Rate: ₱${rate.dailyRate}`);
    console.log(`   Hourly Rate: ₱${rate.hourlyRate.toFixed(2)}`);
    console.log(`   Overtime Rate: ₱${rate.overtimeRate.toFixed(2)}`);
    console.log(`   Effective Date: ${rate.effectiveDate.toLocaleDateString()}`);
    console.log(`   Created By: ${rate.createdByName}`);
    console.log(`   Reason: ${rate.reason}`);
    console.log('');
    console.log('✅ Seed process complete');
    
  } catch (error) {
    console.error('❌ Error seeding salary rate:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run seed function
seedSalaryRate();
