import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

async function fixAdminPin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define simple schema to bypass pre-save hooks
    const EmployeeSchema = new mongoose.Schema({}, { strict: false });
    const Employee = mongoose.model('Employee', EmployeeSchema);

    // Find admin
    const admin = await Employee.findOne({ username: 'ADMIN' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }

    console.log('=== CURRENT ADMIN DATA ===');
    console.log('Username:', admin.username);
    console.log('Admin PIN value:', admin.adminPin);
    console.log('Admin PIN length:', admin.adminPin ? admin.adminPin.length : 0);
    console.log('Looks like bcrypt hash:', admin.adminPin ? admin.adminPin.startsWith('$2') : false);
    
    // Test current PIN
    console.log('\n=== TESTING CURRENT PIN ===');
    if (admin.adminPin && admin.adminPin.startsWith('$2')) {
      const match = await bcrypt.compare('111111', admin.adminPin);
      console.log('Does "111111" match current hash:', match);
      
      if (!match) {
        console.log('\n🔧 PIN does NOT match! Need to fix it...');
        console.log('Hashing new PIN: 111111');
        
        const newPinHash = await bcrypt.hash('111111', 10);
        console.log('New PIN hash:', newPinHash.substring(0, 30) + '...');
        
        // Update directly in database
        await Employee.updateOne(
          { _id: admin._id },
          { $set: { adminPin: newPinHash } }
        );
        
        console.log('✅ Admin PIN updated in database');
        
        // Verify the fix
        const verifyAdmin = await Employee.findOne({ _id: admin._id });
        const verifyMatch = await bcrypt.compare('111111', verifyAdmin.adminPin);
        console.log('\n=== VERIFICATION ===');
        console.log('New PIN hash in DB:', verifyAdmin.adminPin.substring(0, 30) + '...');
        console.log('Does "111111" match new hash:', verifyMatch ? '✅ YES!' : '❌ NO');
      } else {
        console.log('✅ PIN already matches!');
      }
    } else {
      console.log('PIN is plain text or not set properly');
      console.log('\n🔧 Hashing PIN...');
      const newPinHash = await bcrypt.hash('111111', 10);
      await Employee.updateOne(
        { _id: admin._id },
        { $set: { adminPin: newPinHash } }
      );
      console.log('✅ PIN fixed!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminPin();
