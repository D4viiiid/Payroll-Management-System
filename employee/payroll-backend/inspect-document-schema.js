import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function inspectSchema() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // Get the raw MongoDB collection
    const db = mongoose.connection.db;
    const collection = db.collection('employees');

    // Find one document to see its structure
    const doc = await collection.findOne({ employeeId: 'EMP-9080' });
    
    console.log('📋 ACTUAL DOCUMENT STRUCTURE IN MONGODB:');
    console.log('=====================================\n');
    console.log(JSON.stringify(doc, null, 2));

    console.log('\n\n📋 ALL FIELDS IN DOCUMENT:');
    console.log('========================');
    Object.keys(doc).forEach(key => {
      console.log(`  - ${key}: ${typeof doc[key]}`);
    });

    console.log('\n\n🔍 Checking profilePicture field:');
    console.log(`  - Exists in document: ${doc.hasOwnProperty('profilePicture')}`);
    console.log(`  - Value: ${doc.profilePicture || 'UNDEFINED'}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inspectSchema();
