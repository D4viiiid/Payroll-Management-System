import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/EmployeeModels.js';

dotenv.config({ path: './config.env' });

const checkFingerprintFormats = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');
    console.log('Connected to MongoDB');
    
    // Get all employees with fingerprints, sorted by creation date
    const employees = await Employee.find({ fingerprintEnrolled: true }).sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${employees.length} employees with fingerprints`);
    
    employees.forEach((emp, index) => {
      console.log(`\n--- Employee ${index + 1} ---`);
      console.log(`Name: ${emp.firstName} ${emp.lastName}`);
      console.log(`Employee ID: ${emp.employeeId}`);
      console.log(`Created: ${emp.createdAt}`);
      console.log(`Fingerprint Template Type: ${typeof emp.fingerprintTemplate}`);
      console.log(`Fingerprint Template Value: ${emp.fingerprintTemplate}`);
      
      if (emp.fingerprintTemplate) {
        if (typeof emp.fingerprintTemplate === 'string') {
          console.log(`String Length: ${emp.fingerprintTemplate.length}`);
          console.log(`First 100 chars: ${emp.fingerprintTemplate.substring(0, 100)}`);
          console.log(`Last 100 chars: ${emp.fingerprintTemplate.substring(emp.fingerprintTemplate.length - 100)}`);
        } else {
          console.log(`Object Type: ${emp.fingerprintTemplate.constructor.name}`);
          console.log(`Object Keys: ${Object.keys(emp.fingerprintTemplate)}`);
        }
      }
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkFingerprintFormats();