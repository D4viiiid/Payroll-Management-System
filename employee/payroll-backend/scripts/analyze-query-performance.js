import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

async function analyzeQueries() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Test 1: Employee GET query (current implementation)
    console.log('📊 TEST 1: Current Employee GET query');
    console.log('Query: db.employees.find().sort({ createdAt: -1 })');
    const start1 = Date.now();
    const explain1 = await db.collection('employees').find().sort({ createdAt: -1 }).explain('executionStats');
    const time1 = Date.now() - start1;
    console.log(`⏱️  Execution time: ${time1}ms`);
    console.log(`📖 Documents scanned: ${explain1.executionStats.totalDocsExamined}`);
    console.log(`📄 Documents returned: ${explain1.executionStats.nReturned}`);
    console.log(`🔍 Index used: ${explain1.executionStats.executionStages.inputStage?.indexName || 'COLLSCAN'}`);
    console.log('');

    // Test 2: Employee Login query (username)
    console.log('📊 TEST 2: Employee Login query (username)');
    console.log('Query: db.employees.findOne({ username: "admin", isActive: true })');
    const start2 = Date.now();
    const explain2 = await db.collection('employees').find({ username: "admin", isActive: true }).explain('executionStats');
    const time2 = Date.now() - start2;
    console.log(`⏱️  Execution time: ${time2}ms`);
    console.log(`📖 Documents scanned: ${explain2.executionStats.totalDocsExamined}`);
    console.log(`📄 Documents returned: ${explain2.executionStats.nReturned}`);
    console.log(`🔍 Index used: ${explain2.executionStats.executionStages.inputStage?.indexName || 'COLLSCAN'}`);
    console.log('');

    // Test 3: Attendance query
    console.log('📊 TEST 3: Attendance GET query');
    console.log('Query: db.attendances.find().sort({ date: -1 }).limit(50)');
    const start3 = Date.now();
    const explain3 = await db.collection('attendances').find().sort({ date: -1 }).limit(50).explain('executionStats');
    const time3 = Date.now() - start3;
    console.log(`⏱️  Execution time: ${time3}ms`);
    console.log(`📖 Documents scanned: ${explain3.executionStats.totalDocsExamined}`);
    console.log(`📄 Documents returned: ${explain3.executionStats.nReturned}`);
    console.log(`🔍 Index used: ${explain3.executionStats.executionStages.inputStage?.indexName || 'COLLSCAN'}`);
    console.log('');

    // Test 4: SalaryRate current query
    console.log('📊 TEST 4: SalaryRate current query');
    console.log('Query: db.salaryrates.findOne({ isActive: true }).sort({ effectiveDate: -1 })');
    const start4 = Date.now();
    const explain4 = await db.collection('salaryrates').find({ isActive: true }).sort({ effectiveDate: -1 }).limit(1).explain('executionStats');
    const time4 = Date.now() - start4;
    console.log(`⏱️  Execution time: ${time4}ms`);
    console.log(`📖 Documents scanned: ${explain4.executionStats.totalDocsExamined}`);
    console.log(`📄 Documents returned: ${explain4.executionStats.nReturned}`);
    console.log(`🔍 Index used: ${explain4.executionStats.executionStages.inputStage?.indexName || 'COLLSCAN'}`);
    console.log('');

    // Test 5: Cash Advance archived query
    console.log('📊 TEST 5: Cash Advance archived query');
    console.log('Query: db.cashadvances.find({ archived: true }).sort({ requestDate: -1 })');
    const start5 = Date.now();
    const explain5 = await db.collection('cashadvances').find({ archived: true }).sort({ requestDate: -1 }).explain('executionStats');
    const time5 = Date.now() - start5;
    console.log(`⏱️  Execution time: ${time5}ms`);
    console.log(`📖 Documents scanned: ${explain5.executionStats.totalDocsExamined}`);
    console.log(`📄 Documents returned: ${explain5.executionStats.nReturned}`);
    console.log(`🔍 Index used: ${explain5.executionStats.executionStages.inputStage?.indexName || 'COLLSCAN'}`);
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Analysis complete');
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error analyzing queries:', error);
    process.exit(1);
  }
}

analyzeQueries();
