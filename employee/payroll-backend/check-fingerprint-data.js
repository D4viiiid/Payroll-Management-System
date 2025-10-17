/**
 * Check Fingerprint Data in Database
 * Investigates why employees show fingerprintEnrolled: true but 0 templates
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db';

async function checkFingerprintData() {
  try {
    console.log('🔍 CHECKING FINGERPRINT DATA');
    console.log('============================================================\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Employee = mongoose.connection.collection('employees');

    // Get employees with fingerprintEnrolled: true
    const enrolledEmployees = await Employee.find({ fingerprintEnrolled: true }).toArray();
    console.log(`📊 Found ${enrolledEmployees.length} employees with fingerprintEnrolled: true\n`);

    let hasLegacyField = 0;
    let hasNewField = 0;
    let hasNoData = 0;

    console.log('📋 FINGERPRINT DATA ANALYSIS:\n');

    for (const emp of enrolledEmployees) {
      console.log(`👤 ${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      
      // Check legacy field
      if (emp.fingerprintTemplate) {
        console.log(`   ✅ Legacy field (fingerprintTemplate): ${emp.fingerprintTemplate.length} chars`);
        hasLegacyField++;
      } else {
        console.log(`   ❌ Legacy field (fingerprintTemplate): null`);
      }

      // Check new field
      if (emp.fingerprintTemplates && Array.isArray(emp.fingerprintTemplates)) {
        console.log(`   ✅ New field (fingerprintTemplates): ${emp.fingerprintTemplates.length} templates`);
        if (emp.fingerprintTemplates.length > 0) {
          hasNewField++;
          emp.fingerprintTemplates.forEach((t, i) => {
            console.log(`      Template ${i + 1}: ${t.template ? t.template.length + ' chars' : 'null'} | Finger: ${t.finger || 'unknown'}`);
          });
        }
      } else {
        console.log(`   ❌ New field (fingerprintTemplates): not an array or missing`);
      }

      // Check if any data exists
      const hasData = emp.fingerprintTemplate || (emp.fingerprintTemplates && emp.fingerprintTemplates.length > 0);
      if (!hasData) {
        console.log(`   ⚠️  NO FINGERPRINT DATA FOUND`);
        hasNoData++;
      }

      console.log('');
    }

    console.log('============================================================');
    console.log('📊 SUMMARY:');
    console.log(`   Employees with legacy field data: ${hasLegacyField}`);
    console.log(`   Employees with new field data: ${hasNewField}`);
    console.log(`   Employees with NO data: ${hasNoData}`);
    console.log('============================================================\n');

    if (hasLegacyField > 0 && hasNoData === 0) {
      console.log('💡 RECOMMENDATION: Migrate legacy fingerprintTemplate to fingerprintTemplates array');
    } else if (hasNoData > 0) {
      console.log('⚠️  WARNING: Some employees marked as enrolled but have no fingerprint data!');
      console.log('   These employees need to re-enroll their fingerprints.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkFingerprintData();
