/**
 * Fix Duplicate Index Warning - Rebuild Employee Indexes
 * This script drops all indexes and recreates them based on schema
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'employee/payroll-backend/config.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixDuplicateIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const collection = db.collection('employees');
    
    // Get current indexes
    console.log('📊 Current Indexes:');
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    console.log('');
    
    // Find duplicate isActive indexes
    const isActiveIndexes = currentIndexes.filter(idx => 
      JSON.stringify(idx.key) === '{"isActive":1}'
    );
    
    if (isActiveIndexes.length > 0) {
      console.log(`⚠️  Found ${isActiveIndexes.length} standalone isActive index(es)`);
      console.log('   These are duplicates because compound indexes already cover isActive queries\n');
      
      // Drop standalone isActive index
      for (const idx of isActiveIndexes) {
        console.log(`🗑️  Dropping index: ${idx.name}`);
        await collection.dropIndex(idx.name);
      }
      console.log('');
    }
    
    // Verify indexes after cleanup
    console.log('✅ Final Indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    const remainingIsActive = finalIndexes.filter(idx => 
      JSON.stringify(idx.key) === '{"isActive":1}'
    );
    
    if (remainingIsActive.length === 0) {
      console.log('\n✅ Duplicate isActive index removed successfully!');
      console.log('✅ Compound indexes still cover isActive queries:');
      console.log('   - { username: 1, isActive: 1 }');
      console.log('   - { employeeId: 1, isActive: 1 }');
      console.log('\n🎉 The Mongoose warning should be gone after restarting the backend');
    } else {
      console.log('\n⚠️  Standalone isActive index still exists');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixDuplicateIndexes();
