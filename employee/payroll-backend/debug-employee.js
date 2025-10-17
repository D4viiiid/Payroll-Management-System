import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'config.env') });

async function debugEmployee() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('✅ Connected to MongoDB');

    // Find employee with fingerprint template
    console.log('🔍 Searching for employee with fingerprint template "ENROLLED"...');
    const employee = await Employee.findOne({ fingerprintTemplate: 'ENROLLED' });

    if (employee) {
      console.log('✅ Employee found:');
      console.log('   - Name:', employee.firstName, employee.lastName);
      console.log('   - Employee ID:', employee.employeeId);
      console.log('   - Fingerprint Template:', employee.fingerprintTemplate);
      console.log('   - Fingerprint Enrolled:', employee.fingerprintEnrolled);
    } else {
      console.log('❌ No employee found with fingerprint template "ENROLLED"');

      // List all employees
      console.log('📋 All employees in database:');
      const allEmployees = await Employee.find({});
      if (allEmployees.length === 0) {
        console.log('   No employees found in database');
      } else {
        allEmployees.forEach((emp, index) => {
          console.log(`   ${index + 1}. ${emp.firstName} ${emp.lastName} (${emp.employeeId}) - Fingerprint: ${emp.fingerprintTemplate || 'None'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

debugEmployee();
