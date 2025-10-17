import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'config.env') });

console.log('🧪 Testing MongoDB Connection...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing');

async function testConnection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db');

    console.log('✅ MongoDB Connected Successfully!');

    // Get database info
    const db = mongoose.connection.db;
    const collections = await db.collections();
    console.log(`📊 Database: ${db.databaseName}`);
    console.log(`📁 Collections: ${collections.length}`);

    // List collection names
    if (collections.length > 0) {
      console.log('📋 Collection names:');
      collections.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.collectionName}`);
      });
    }

    // Test a simple query on employees collection
    const Employee = mongoose.model('Employee', new mongoose.Schema({}), 'employees');
    const employeeCount = await Employee.countDocuments();
    console.log(`👥 Total employees: ${employeeCount}`);

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed successfully');

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error('Error:', error.message);

    if (error.message.includes('authentication failed')) {
      console.log('💡 This might be due to incorrect credentials in MONGODB_URI');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('💡 This might be due to network connectivity or incorrect host');
    }
  }
}

testConnection();
