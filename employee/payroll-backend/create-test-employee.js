import mongoose from 'mongoose';
import Employee from './models/EmployeeModels.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'config.env') });

async function createTestEmployee() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('✅ Connected to MongoDB');

    // Check if test employee already exists
    const existingEmployee = await Employee.findOne({ employeeId: 'EMP-TEST-001' });

    if (existingEmployee) {
      console.log('ℹ️ Test employee already exists:', existingEmployee.firstName, existingEmployee.lastName);
      console.log('📋 Employee ID:', existingEmployee.employeeId);
      console.log('👆 Fingerprint enrolled:', existingEmployee.fingerprintEnrolled);
      return;
    }

    // Create test employee with fingerprint
    const testEmployee = new Employee({
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan.delacruz@test.com',
      contactNumber: '09123456789',
      employeeId: 'EMP-TEST-001',
      status: 'regular',
      position: 'Software Developer',
      hireDate: new Date('2024-01-01'),
      salary: 25000,
      username: 'juandelacruz',
      password: 'Password123', // This will be hashed by the pre-save hook
      isActive: true,
      fingerprintEnrolled: true,
      fingerprintTemplate: 'ENROLLED', // This matches what the frontend sends
      fingerprintStatus: 'registered',
      fingerprintEnrolledAt: new Date()
    });

    await testEmployee.save();
    console.log('✅ Test employee created successfully!');
    console.log('📋 Employee ID:', testEmployee.employeeId);
    console.log('👆 Fingerprint template:', testEmployee.fingerprintTemplate);
    console.log('🔐 Password will be hashed on save');

  } catch (error) {
    console.error('❌ Error creating test employee:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

createTestEmployee();
