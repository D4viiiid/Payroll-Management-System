/**
 * Migrate Legacy Fingerprint Data
 * Converts fingerprintTemplate (single) to fingerprintTemplates (array)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function migrateFingerprintData() {
  try {
    console.log('🔄 MIGRATING FINGERPRINT DATA');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Employee = mongoose.connection.collection('employees');

    // Get employees with legacy data but no new data
    const employees = await Employee.find({
      fingerprintTemplate: { $ne: null, $exists: true },
      $or: [
        { fingerprintTemplates: { $exists: false } },
        { fingerprintTemplates: { $size: 0 } },
        { fingerprintTemplates: null }
      ]
    }).toArray();

    console.log(`📊 Found ${employees.length} employees with legacy fingerprint data\n`);

    let migrated = 0;
    let errors = 0;

    for (const emp of employees) {
      try {
        console.log(`🔄 Migrating: ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
        console.log(`   Legacy template: ${emp.fingerprintTemplate.length} chars`);

        // Create new template array with legacy data
        const newTemplate = {
          template: emp.fingerprintTemplate,
          enrolledAt: emp.createdAt || new Date(),
          finger: 'unknown' // We don't know which finger was used
        };

        // Update employee with new format
        await Employee.updateOne(
          { _id: emp._id },
          {
            $set: {
              fingerprintTemplates: [newTemplate],
              fingerprintEnrolled: true
            }
          }
        );

        console.log(`   ✅ Migrated to new format (1 template in array)\n`);
        migrated++;

      } catch (error) {
        console.error(`   ❌ Error migrating ${emp.employeeId}:`, error.message, '\n');
        errors++;
      }
    }

    // Also fix employees with fingerprintEnrolled: true but no data
    const noDataEmployees = await Employee.find({
      fingerprintEnrolled: true,
      $or: [
        { fingerprintTemplate: null },
        { fingerprintTemplate: { $exists: false } }
      ],
      $or: [
        { fingerprintTemplates: { $exists: false } },
        { fingerprintTemplates: { $size: 0 } },
        { fingerprintTemplates: null }
      ]
    }).toArray();

    console.log(`\n📊 Found ${noDataEmployees.length} employees marked as enrolled but with no data\n`);

    if (noDataEmployees.length > 0) {
      for (const emp of noDataEmployees) {
        console.log(`🔧 Fixing: ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
        await Employee.updateOne(
          { _id: emp._id },
          {
            $set: {
              fingerprintEnrolled: false,
              fingerprintTemplates: []
            }
          }
        );
        console.log(`   ✅ Set fingerprintEnrolled to false\n`);
      }
    }

    console.log('============================================================');
    console.log(`✅ Migration Complete!`);
    console.log(`   Migrated: ${migrated} employees`);
    console.log(`   Fixed: ${noDataEmployees.length} employees with incorrect enrollment status`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors}`);
    }
    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

migrateFingerprintData();
