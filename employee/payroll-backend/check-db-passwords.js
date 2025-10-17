import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/employee_db';

async function checkPasswords() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    const Employee = mongoose.connection.collection('employees');
    const employees = await Employee.find({}).limit(5).toArray();

    console.log('=== SAMPLE EMPLOYEES ===\n');
    for (const emp of employees) {
      console.log(`Employee: ${emp.firstName} ${emp.lastName}`);
      console.log(`  ID: ${emp.employeeId}`);
      console.log(`  Username: ${emp.username}`);
      console.log(`  Password hash: ${emp.password ? emp.password.substring(0, 30) + '...' : 'NONE'}`);
      console.log(`  Plain password: ${emp.plainTextPassword || 'NOT SET'}`);
      console.log('');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkPasswords();
