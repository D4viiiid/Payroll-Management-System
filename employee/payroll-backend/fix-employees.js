import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'config.env') });

async function fixEmployees() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('Connected to MongoDB');
    
    // Find all employees with fingerprintEnrolled: true
    const employees = await Employee.find({ fingerprintEnrolled: true });
    console.log(`Found ${employees.length} employees with fingerprint enrolled`);
    
    for (const emp of employees) {
      // Generate correct password format
      const last4digits = emp.employeeId.slice(-4);
      const correctPassword = `Pass${last4digits}`;
      
      // Update employee
      emp.password = correctPassword;
      emp.isActive = true;
      await emp.save();
      
      console.log(`✅ Fixed employee ${emp.employeeId}: Password=${correctPassword}, isActive=true`);
    }
    
    console.log('✅ All employees fixed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixEmployees();
