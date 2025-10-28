import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false, collection: 'employees' }));

async function resetAllPasswordsToEmployeeID() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Fetch all active employees
    const employees = await Employee.find({ isActive: { $ne: false } }).lean();
    
    console.log(`📊 Found ${employees.length} active employees\n`);
    console.log('🔧 Resetting passwords to Employee IDs...\n');
    console.log('=' .repeat(100));
    
    let successCount = 0;
    const loginCredentials = [];
    
    for (const emp of employees) {
      // Use Employee ID as the password
      const newPassword = emp.employeeId;
      
      // Hash the password using bcrypt (same method as system uses)
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update employee password in database
      await Employee.updateOne(
        { _id: emp._id },
        { $set: { password: hashedPassword } }
      );
      
      const credentials = {
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email || emp.username || 'N/A',
        password: newPassword,
        isAdmin: emp.isAdmin || false
      };
      
      loginCredentials.push(credentials);
      
      console.log(`✅ ${successCount + 1}. ${credentials.name}`);
      console.log(`   Employee ID: ${credentials.employeeId}`);
      console.log(`   Email: ${credentials.email}`);
      console.log(`   🔑 New Password: ${credentials.password}`);
      console.log(`   Role: ${credentials.isAdmin ? '👑 ADMIN' : '👤 Employee'}`);
      console.log('');
      
      successCount++;
    }
    
    console.log('=' .repeat(100));
    console.log('\n✅ Password Reset Complete!\n');
    console.log(`📊 Successfully reset ${successCount} employee passwords\n`);
    
    console.log('📋 LOGIN CREDENTIALS SUMMARY:');
    console.log('=' .repeat(100));
    console.log('\n🔐 **COPY THIS TABLE - USE THESE CREDENTIALS TO LOGIN:**\n');
    
    // Admin accounts first
    const admins = loginCredentials.filter(c => c.isAdmin);
    const regularEmployees = loginCredentials.filter(c => !c.isAdmin);
    
    if (admins.length > 0) {
      console.log('👑 ADMIN ACCOUNTS:');
      console.log('-'.repeat(100));
      admins.forEach((cred, index) => {
        console.log(`${index + 1}. Name: ${cred.name}`);
        console.log(`   Login Email: ${cred.email}`);
        console.log(`   Password: ${cred.password}`);
        console.log(`   Employee ID: ${cred.employeeId}`);
        console.log('');
      });
    }
    
    console.log('👤 EMPLOYEE ACCOUNTS:');
    console.log('-'.repeat(100));
    regularEmployees.forEach((cred, index) => {
      console.log(`${index + 1}. Name: ${cred.name}`);
      console.log(`   Login Email: ${cred.email}`);
      console.log(`   Password: ${cred.password}`);
      console.log(`   Employee ID: ${cred.employeeId}`);
      console.log('');
    });
    
    console.log('=' .repeat(100));
    console.log('\n📝 INSTRUCTIONS:');
    console.log('   1. Go to the login page: https://employee-frontend-eight-rust.vercel.app');
    console.log('   2. Enter the EMAIL and PASSWORD from the table above');
    console.log('   3. Click "Login" button');
    console.log('   4. You will be logged into the employee dashboard');
    console.log('   5. (Optional) Change your password in the dashboard settings\n');
    
    console.log('⚠️  SECURITY NOTE:');
    console.log('   • All passwords have been reset to their Employee IDs');
    console.log('   • This is for testing/recovery purposes only');
    console.log('   • Consider changing passwords after successful login');
    console.log('   • Keep these credentials secure\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAllPasswordsToEmployeeID();
