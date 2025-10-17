import mongoose from 'mongoose';
import Deduction from './models/Deduction.model.js';
import Payroll from './models/Payroll.model.js';

// MongoDB connection string
const mongoURI = 'mongodb://localhost:27017/payroll_db';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');

    // Sample data for Deductions
    const deductionRecords = [
      new Deduction({
        name: 'JJ BUNAO',
        type: 'Advance',
        amount: 1500
      }),
      new Deduction({
        name: 'CARL DAVID PAMPLONA',
        type: 'Absent',
        amount: 1000
      })
    ];

    // Sample data for Payroll
    const payroll = new Payroll({
      name: 'Maria Santos',
      position: 'Accountant',
      userId: '665f1a2b3c4d5e6f7a8b9c0a' // Replace with actual User ObjectId
    });

    try {
      // Save all deductions
      for (const deduction of deductionRecords) {
        await deduction.save();
      }
      await payroll.save();
      console.log('Sample data inserted successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
