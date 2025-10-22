import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/EmployeeModels.js';

dotenv.config({ path: 'config.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const employees = await Employee.find().select('_id firstName lastName employeeId').lean();
  employees.forEach((emp) => {
    console.log(emp.firstName + ' ' + emp.lastName + ': _id=' + emp._id);
  });
  process.exit(0);
});