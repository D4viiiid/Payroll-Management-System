import mongoose from 'mongoose';
import Employee from '../models/EmployeeModels.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from config.env
dotenv.config({ path: path.join(__dirname, '../config.env') });

/**
 * 🔄 MIGRATION SCRIPT: Phase 1 Enhancement
 * Adds salary rate fields to existing employees
 * 
 * This script will:
 * 1. Connect to MongoDB
 * 2. Find all employees without new fields
 * 3. Add default values for:
 *    - employmentType (based on status)
 *    - dailyRate (550)
 *    - hourlyRate (68.75)
 *    - overtimeRate (85.94)
 *    - isActive (true)
 * 4. Save updated employees
 */

const migrateEmployees = async () => {
  try {
    console.log('🔄 Starting Employee Migration...\n');
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  MONGODB_URI not found, using default: mongodb://localhost:27017/employee_db\n');
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all employees
    const employees = await Employee.find({});
    console.log(`📊 Found ${employees.length} employees to process\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const employee of employees) {
      try {
        let needsUpdate = false;
        
        // Check if employee needs migration
        if (!employee.employmentType) {
          // Map old status to new employmentType
          employee.employmentType = employee.status === 'regular' ? 'Regular' : 'On-Call';
          needsUpdate = true;
          console.log(`  → Setting employmentType: ${employee.employmentType}`);
        }
        
        if (!employee.dailyRate) {
          employee.dailyRate = 550;
          needsUpdate = true;
          console.log(`  → Setting dailyRate: ₱550`);
        }
        
        if (!employee.hourlyRate) {
          employee.hourlyRate = 68.75;
          needsUpdate = true;
          console.log(`  → Setting hourlyRate: ₱68.75`);
        }
        
        if (!employee.overtimeRate) {
          employee.overtimeRate = 85.94;
          needsUpdate = true;
          console.log(`  → Setting overtimeRate: ₱85.94`);
        }
        
        if (employee.isActive === undefined || employee.isActive === null) {
          employee.isActive = true;
          needsUpdate = true;
          console.log(`  → Setting isActive: true`);
        }
        
        if (needsUpdate) {
          await employee.save();
          updatedCount++;
          console.log(`✅ Updated: ${employee.firstName} ${employee.lastName} (${employee.employeeId})\n`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped: ${employee.firstName} ${employee.lastName} (already migrated)\n`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating ${employee.firstName} ${employee.lastName}:`, error.message);
      }
    }
    
    // Print summary
    console.log('\n========================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('========================================');
    console.log(`Total Employees:     ${employees.length}`);
    console.log(`✅ Updated:          ${updatedCount}`);
    console.log(`⏭️  Skipped:          ${skippedCount}`);
    console.log(`❌ Errors:           ${errorCount}`);
    console.log('========================================\n');
    
    if (errorCount === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with errors. Please review the logs.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
migrateEmployees()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });

export default migrateEmployees;
