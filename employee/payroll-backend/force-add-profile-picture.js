import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function forceAddProfilePicture() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // Get the raw MongoDB collection (bypass Mongoose schema)
    const db = mongoose.connection.db;
    const collection = db.collection('employees');

    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    console.log('🔄 Forcing profilePicture field with raw MongoDB...');
    const result = await collection.updateOne(
      { employeeId: 'EMP-9080' },
      { $set: { profilePicture: testImageBase64 } }
    );
    
    console.log(`✅ Update result: ${result.matchedCount} matched, ${result.modifiedCount} modified\n`);

    // Verify
    const doc = await collection.findOne({ employeeId: 'EMP-9080' });
    console.log('📋 VERIFICATION:');
    console.log(`  - profilePicture exists: ${doc.hasOwnProperty('profilePicture')}`);
    console.log(`  - profilePicture length: ${doc.profilePicture?.length || 0} chars`);
    
    if (doc.profilePicture) {
      console.log('\n✅ SUCCESS! Profile picture field now exists in database!');
    } else {
      console.log('\n❌ FAILED! Still no profilePicture field!');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

forceAddProfilePicture();
