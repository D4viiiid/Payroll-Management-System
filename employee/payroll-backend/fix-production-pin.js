import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Production MongoDB URI (from your config.env)
const MONGODB_URI = 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function testProductionPinVerification() {
  try {
    console.log('🔗 Connecting to PRODUCTION MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database\n');

    // Define simple schema to bypass hooks
    const EmployeeSchema = new mongoose.Schema({}, { strict: false });
    const Employee = mongoose.model('Employee', EmployeeSchema);

    // Find admin in production
    const admin = await Employee.findOne({ username: 'ADMIN' });
    
    if (!admin) {
      console.log('❌ Admin account not found in production database');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('=== PRODUCTION ADMIN ACCOUNT ===');
    console.log('Username:', admin.username);
    console.log('Employee ID:', admin.employeeId);
    console.log('Email:', admin.email);
    console.log('Is Admin:', admin.isAdmin);
    console.log('Admin PIN exists:', !!admin.adminPin);
    console.log('Admin PIN value:', admin.adminPin ? (admin.adminPin.length > 20 ? `[HASH: ${admin.adminPin.substring(0, 30)}...]` : admin.adminPin) : 'NOT SET');
    
    // Test PIN verification
    console.log('\n=== PIN VERIFICATION TEST ===');
    console.log('Testing PIN: 111111');
    
    if (!admin.adminPin) {
      console.log('❌ Admin PIN not set in production database!');
      console.log('🔧 Need to set PIN...');
      
      const newPinHash = await bcrypt.hash('111111', 10);
      await Employee.updateOne(
        { _id: admin._id },
        { $set: { adminPin: newPinHash } }
      );
      console.log('✅ PIN set in production database');
      
      // Verify
      const updated = await Employee.findOne({ _id: admin._id });
      const match = await bcrypt.compare('111111', updated.adminPin);
      console.log('Verification after setting:', match ? '✅ PASS' : '❌ FAIL');
      
    } else if (admin.adminPin.length < 20) {
      // Plain text PIN
      console.log('⚠️ PIN is plain text, not hashed!');
      console.log('🔧 Hashing PIN...');
      
      const newPinHash = await bcrypt.hash('111111', 10);
      await Employee.updateOne(
        { _id: admin._id },
        { $set: { adminPin: newPinHash } }
      );
      console.log('✅ PIN hashed in production database');
      
      // Verify
      const updated = await Employee.findOne({ _id: admin._id });
      const match = await bcrypt.compare('111111', updated.adminPin);
      console.log('Verification after hashing:', match ? '✅ PASS' : '❌ FAIL');
      
    } else {
      // Already hashed, test it
      const match = await bcrypt.compare('111111', admin.adminPin);
      console.log('Current PIN verification:', match ? '✅ PASS' : '❌ FAIL');
      
      if (!match) {
        console.log('\n⚠️ Current PIN does not match "111111"');
        console.log('🔧 Re-hashing with correct PIN...');
        
        const newPinHash = await bcrypt.hash('111111', 10);
        await Employee.updateOne(
          { _id: admin._id },
          { $set: { adminPin: newPinHash } }
        );
        console.log('✅ PIN re-hashed in production database');
        
        // Verify
        const updated = await Employee.findOne({ _id: admin._id });
        const verifyMatch = await bcrypt.compare('111111', updated.adminPin);
        console.log('Verification after re-hashing:', verifyMatch ? '✅ PASS' : '❌ FAIL');
      }
    }
    
    console.log('\n🎉 Production database PIN is now ready!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: ADMIN');
    console.log('   Password: ADMIN123');
    console.log('   PIN: 111111');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testProductionPinVerification();
