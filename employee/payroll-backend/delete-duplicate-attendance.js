import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

async function deleteDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    
    // Delete all attendance records for Gabriel to start fresh
    const result = await db.collection('attendances').deleteMany({ 
      employeeId: 'EMP-7479' 
    });
    
    console.log(`🗑️ Deleted ${result.deletedCount} duplicate attendance records`);
    console.log('✅ Ready for fresh test!\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteDuplicates();
