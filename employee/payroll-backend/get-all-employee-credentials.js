import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false, collection: 'employees' }));

async function getAllEmployeeCredentials() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Fetch all employees with login credentials
    const employees = await Employee.find(
      { isActive: { $ne: false } },
      { 
        employeeId: 1, 
        firstName: 1, 
        lastName: 1, 
        email: 1, 
        username: 1, 
        password: 1,
        isAdmin: 1,
        position: 1,
        status: 1
      }
    ).sort({ employeeId: 1 }).lean();
    
    console.log(`📊 Found ${employees.length} active employees\n`);
    console.log('=' .repeat(120));
    console.log('EMPLOYEE LOGIN CREDENTIALS');
    console.log('=' .repeat(120));
    console.log('');
    
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.firstName} ${emp.lastName}`);
      console.log(`   Employee ID: ${emp.employeeId}`);
      console.log(`   Position: ${emp.position || 'N/A'}`);
      console.log(`   Status: ${emp.status || 'N/A'}`);
      console.log(`   Role: ${emp.isAdmin ? '👑 ADMIN' : '👤 Employee'}`);
      console.log(`   ---`);
      console.log(`   📧 Email/Username: ${emp.email || emp.username || 'N/A'}`);
      console.log(`   🔑 Password (Hashed): ${emp.password || 'NOT SET'}`);
      console.log(`   ---`);
      console.log(`   ✅ LOGIN CREDENTIALS:`);
      console.log(`      Email: ${emp.email || emp.username || 'N/A'}`);
      console.log(`      Password: [Use original password - hashed in DB]`);
      console.log('');
      console.log('-' .repeat(120));
      console.log('');
    });
    
    console.log('\n📋 SUMMARY:');
    console.log(`   Total Active Employees: ${employees.length}`);
    console.log(`   Admins: ${employees.filter(e => e.isAdmin).length}`);
    console.log(`   Regular Employees: ${employees.filter(e => !e.isAdmin).length}`);
    console.log(`   Employees with Email: ${employees.filter(e => e.email).length}`);
    console.log(`   Employees with Password: ${employees.filter(e => e.password).length}`);
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   • Passwords are hashed using bcrypt (cannot be reversed)');
    console.log('   • To login, you need the ORIGINAL password that was set during employee creation');
    console.log('   • If you forgot a password, you need to reset it in the Admin Settings');
    console.log('   • Default password pattern for new employees: Usually "password123" or employee-specific');
    console.log('');
    
    // Check for employees without passwords
    const noPassword = employees.filter(e => !e.password);
    if (noPassword.length > 0) {
      console.log('\n⚠️  EMPLOYEES WITHOUT PASSWORD SET:');
      noPassword.forEach(emp => {
        console.log(`   • ${emp.firstName} ${emp.lastName} (${emp.employeeId}) - Email: ${emp.email || 'N/A'}`);
      });
      console.log('   ↳ These employees cannot login until password is set\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getAllEmployeeCredentials();
