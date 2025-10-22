import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

async function forceFixAdminPin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Use direct MongoDB collection to bypass Mongoose hooks
    const db = mongoose.connection.db;
    const employeesCollection = db.collection('employees');

    // Find admin
    const admin = await employeesCollection.findOne({ username: 'ADMIN' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }

    console.log('=== CURRENT ADMIN DATA (Direct MongoDB) ===');
    console.log('Username:', admin.username);
    console.log('Admin PIN value:', admin.adminPin);
    console.log('Admin PIN length:', admin.adminPin ? admin.adminPin.length : 0);
    console.log('Is bcrypt hash:', admin.adminPin && admin.adminPin.length > 20);
    
    // ALWAYS create fresh hash for PIN: 111111
    console.log('\n🔧 Creating fresh PIN hash for: 111111');
    const newPinHash = await bcrypt.hash('111111', 10);
    console.log('New PIN hash:', newPinHash);
    console.log('New hash length:', newPinHash.length);
    
    // Update directly using MongoDB collection (bypasses all Mongoose hooks)
    const result = await employeesCollection.updateOne(
      { _id: admin._id },
      { $set: { adminPin: newPinHash } }
    );
    
    console.log('\n✅ Update result:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');
    
    // Verify
    const updated = await employeesCollection.findOne({ _id: admin._id });
    console.log('\n=== VERIFICATION ===');
    console.log('Updated PIN in DB:', updated.adminPin);
    
    const testMatch = await bcrypt.compare('111111', updated.adminPin);
    console.log('Does "111111" match:', testMatch ? '✅ YES!' : '❌ NO');
    
    if (testMatch) {
      console.log('\n🎉 SUCCESS! Admin PIN is now properly hashed and verified!');
    } else {
      console.log('\n❌ FAILED! PIN still not matching!');
    }

    await mongoose.connection.close();
    process.exit(testMatch ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceFixAdminPin();
