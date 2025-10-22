import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

async function testPasswordDirectly() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collection = db.collection('employees');
    
    const admin = await collection.findOne({ username: 'admin' });
    
    console.log('\n📋 Admin Account:');
    console.log('   Username:', admin.username);
    console.log('   Password Hash:', admin.password);
    console.log('   Is Active:', admin.isActive);
    console.log('   Is Admin:', admin.isAdmin);
    console.log();

    // Test password
    const testPassword = 'admin123';
    console.log('🔐 Testing password:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log('   Result:', isValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isValid) {
      console.log('\n⚠️  Stored password hash does NOT match "admin123"');
      console.log('   Rehashing password...');
      
      const newHash = await bcrypt.hash('admin123', 10);
      console.log('   New hash:', newHash);
      
      await collection.updateOne(
        { _id: admin._id },
        { $set: { password: newHash } }
      );
      
      console.log('✅ Password updated to "admin123"');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testPasswordDirectly();
