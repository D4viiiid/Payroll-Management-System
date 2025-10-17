import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employeeDB';

async function clearPendingCashAdvances() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const CashAdvance = mongoose.model('CashAdvance', new mongoose.Schema({}, { strict: false }));
    
    // Find pending advances
    const pending = await CashAdvance.find({ status: 'Pending' }).lean();
    
    if (pending.length > 0) {
      console.log(`Found ${pending.length} pending cash advances:`);
      pending.forEach(adv => {
        console.log(`   - Amount: ₱${adv.amount}, Request Date: ${new Date(adv.requestDate).toLocaleDateString()}`);
      });
      
      // Delete them
      const result = await CashAdvance.deleteMany({ status: 'Pending' });
      console.log(`\n✅ Deleted ${result.deletedCount} pending cash advances`);
    } else {
      console.log('No pending cash advances found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

clearPendingCashAdvances();
