/**
 * Check admin account in database
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'employee/payroll-backend/config.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Find admin user
    const admins = await db.collection('employees').find({ 
      isAdmin: true 
    }).toArray();
    
    console.log(`📊 Found ${admins.length} admin account(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Admin Account:`);
      console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Employee ID: ${admin.employeeId}`);
      console.log(`   Password Hash: ${admin.password ? admin.password.substring(0, 20) + '...' : 'NOT SET'}`);
      console.log(`   Is Admin: ${admin.isAdmin}`);
      console.log(`   Is Active: ${admin.isActive}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log('');
    });
    
    // Check if Allan username exists
    const allan = await db.collection('employees').findOne({ username: 'Allan' });
    if (allan) {
      console.log('✅ "Allan" username found:');
      console.log(`   Name: ${allan.firstName} ${allan.lastName}`);
      console.log(`   Is Admin: ${allan.isAdmin}`);
      console.log(`   Is Active: ${allan.isActive}`);
      console.log(`   Password set: ${!!allan.password}`);
    } else {
      console.log('❌ "Allan" username NOT found in database');
      console.log('\n💡 Creating test admin account...');
      
      // Import bcrypt
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('Allan123', 10);
      
      const newAdmin = {
        firstName: 'Allan',
        lastName: 'Administrator',
        email: 'allan@company.com',
        contactNumber: '1234567890',
        employeeId: 'ADM001',
        status: 'regular',
        position: 'System Administrator',
        hireDate: new Date(),
        username: 'Allan',
        password: hashedPassword,
        isAdmin: true,
        isActive: true,
        fingerprintEnrolled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('employees').insertOne(newAdmin);
      console.log('✅ Test admin account created!');
      console.log(`   Username: Allan`);
      console.log(`   Password: Allan123`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAdmin();
