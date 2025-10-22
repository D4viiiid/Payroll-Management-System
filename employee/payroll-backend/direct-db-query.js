import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

async function directQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Direct database query without Employee model
    const db = mongoose.connection.db;
    const collection = db.collection('employees');
    
    const admin = await collection.findOne({ 
      $or: [
        { username: 'admin' },
        { isAdmin: true }
      ]
    });

    console.log('\n📋 Direct Database Query Result:');
    console.log(JSON.stringify(admin, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

directQuery();
