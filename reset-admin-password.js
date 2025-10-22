/**
 * Reset Admin Password
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'employee/payroll-backend/config.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function resetAdminPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Find admin user
    const admin = await db.collection('employees').findOne({ 
      username: 'ADMIN'
    });
    
    if (!admin) {
      console.log('❌ Admin user "ADMIN" not found!');
      process.exit(1);
    }
    
    console.log(`📊 Found admin account:`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}\n`);
    
    // Set new password
    const newPassword = 'Admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db.collection('employees').updateOne(
      { username: 'ADMIN' },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('✅ Admin password reset successfully!');
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Username: ADMIN`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n✅ You can now login with these credentials`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();
