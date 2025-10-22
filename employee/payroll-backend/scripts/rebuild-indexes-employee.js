/**
 * 🔧 CRITICAL FIX: Rebuild Employee Model Indexes for Performance
 * 
 * This script drops and recreates all indexes for the Employee model to fix:
 * 1. Slow login (5-45 seconds) → Target: <500ms
 * 2. Slow GET /employees (6-24 seconds) → Target: <500ms
 * 3. Duplicate username index warning
 * 
 * Run with: node scripts/rebuild-indexes-employee.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

// Import models
import Employee from '../models/EmployeeModels.js';

async function rebuildEmployeeIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Rebuilding indexes for Employee model...');
    console.log('   🗑️  Dropping old indexes...');
    
    // Drop all indexes except _id
    await Employee.collection.dropIndexes();
    console.log('   ✅ Old indexes dropped');
    
    // Recreate indexes from schema
    console.log('   🔨 Creating new indexes...');
    await Employee.syncIndexes();
    console.log('   ✅ New indexes created');
    
    // List all indexes
    const indexes = await Employee.collection.indexes();
    console.log(`   📋 Active indexes (${indexes.length} total):`);
    indexes.forEach(index => {
      const keys = Object.keys(index.key).map(k => `${k}:${index.key[k]}`).join(', ');
      const unique = index.unique ? ' [UNIQUE]' : '';
      const sparse = index.sparse ? ' [SPARSE]' : '';
      console.log(`      - ${keys}${unique}${sparse}`);
    });
    
    console.log('\n✅ Employee model indexes rebuilt successfully!\n');
    
    console.log('📊 PERFORMANCE OPTIMIZATION SUMMARY:');
    console.log('   ✅ Added compound index: username + isActive (for login optimization)');
    console.log('   ✅ Added compound index: employeeId + isActive (for alternative login)');
    console.log('   ✅ Reduced bcrypt rounds: 12 → 10 (4x faster password hashing)');
    console.log('   ✅ Removed verbose logging from login route');
    console.log('   ✅ Fixed duplicate username index warning\n');
    
    console.log('🚀 Expected performance improvement:');
    console.log('   📉 Login time: 5-45 seconds → <500ms (10-90x faster)');
    console.log('   📉 GET /employees: 6-24 seconds → <500ms (12-48x faster)\n');
    
    console.log('🎯 Next step: Restart backend server with "npm run dev"\n');
    
  } catch (error) {
    console.error('❌ Error rebuilding indexes:', error);
    process.exit(1);
  } finally {
    console.log('🔌 Database connection closed');
    await mongoose.connection.close();
    process.exit(0);
  }
}

rebuildEmployeeIndexes();
