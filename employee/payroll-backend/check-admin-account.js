import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

import Employee from './models/EmployeeModels.js';

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const admin = await Employee.findOne({ 
      $or: [
        { username: 'admin' },
        { isAdmin: true }
      ]
    }).select('+password adminPin');

    console.log('📋 Admin Account Details:');
    console.log(JSON.stringify(admin, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkAdmin();
