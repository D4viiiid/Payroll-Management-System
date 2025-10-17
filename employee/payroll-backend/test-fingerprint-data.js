import { MongoClient } from 'mongodb';

async function checkFingerprintData() {
  // Use the same URI as the backend
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log(`\n🔗 Connected to: ${uri.substring(0, 50)}...`);
    
    const db = client.db('employee_db');  // Use employee_db
    
    // Check all employees first
    const allEmployees = await db.collection('employees').find({}).toArray();
    console.log(`\n📊 Total employees in database: ${allEmployees.length}\n`);
    
    const employees = await db.collection('employees').find({ 
      fingerprintEnrolled: true 
    }).limit(3).toArray();
    
    console.log(`\n📊 Employee Fingerprint Data Analysis:\n`);
    console.log(`Total enrolled employees: ${employees.length}\n`);
    
    // Get employees with actual template data
    const employeesWithTemplate = await db.collection('employees').find({
      $or: [
        { fingerprintTemplate: { $exists: true, $ne: null, $ne: "" } },
        { fingerprintTemplates: { $exists: true, $ne: [] } }
      ]
    }).toArray();
    
    console.log(`\n🔍 Employees with fingerprint templates: ${employeesWithTemplate.length}\n`);
    
    employeesWithTemplate.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.firstName} ${emp.lastName}:`);
      console.log(`   employeeId: ${emp.employeeId}`);
      console.log(`   fingerprintTemplate exists: ${!!emp.fingerprintTemplate}`);
      console.log(`   fingerprintTemplate length: ${emp.fingerprintTemplate?.length || 0}`);
      console.log(`   fingerprintTemplates array length: ${emp.fingerprintTemplates?.length || 0}`);
      
      if (emp.fingerprintTemplates && emp.fingerprintTemplates.length > 0) {
        emp.fingerprintTemplates.forEach((fp, fpIdx) => {
          console.log(`   Template ${fpIdx + 1}:`);
          console.log(`     - template length: ${fp.template?.length || 0}`);
          console.log(`     - enrolledAt: ${fp.enrolledAt}`);
          console.log(`     - finger: ${fp.finger}`);
        });
      }
      
      // Check if template is base64
      if (emp.fingerprintTemplate) {
        try {
          const decoded = Buffer.from(emp.fingerprintTemplate, 'base64');
          console.log(`   Decoded template size: ${decoded.length} bytes`);
        } catch (e) {
          console.log(`   ⚠️ Template is not valid base64: ${e.message}`);
        }
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkFingerprintData();
