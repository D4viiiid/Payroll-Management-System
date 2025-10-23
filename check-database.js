import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './employee/payroll-backend/config.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0';

// Simple colored output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Employee Schema
const employeeSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  employeeId: String,
  isActive: Boolean
}, { collection: 'employees' });

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  employeeId: String,
  date: Date,
  timeIn: Date,
  timeOut: Date,
  status: String,
  dayType: String,
  archived: Boolean
}, { collection: 'attendances' });

const Employee = mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// Philippines timezone helper
function getPhilippinesDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
}

function getStartOfDay() {
  const now = getPhilippinesDate();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getEndOfDay() {
  const now = getPhilippinesDate();
  now.setHours(23, 59, 59, 999);
  return now;
}

async function checkDatabase() {
  try {
    console.log(colors.cyan('🔍 DATABASE ANALYSIS'));
    console.log(colors.cyan('================================='));
    console.log('');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(colors.green('✅ Connected to MongoDB'));
    console.log('');
    
    // Check employees
    const totalEmployees = await Employee.countDocuments({});
    const activeEmployees = await Employee.countDocuments({ isActive: true });
    const inactiveEmployees = await Employee.countDocuments({ isActive: false });
    
    console.log(colors.bold('👥 EMPLOYEE STATISTICS:'));
    console.log(`   Total Employees: ${totalEmployees}`);
    console.log(`   Active Employees: ${colors.green(activeEmployees)}`);
    console.log(`   Inactive Employees: ${colors.red(inactiveEmployees)}`);
    console.log('');
    
    // Get today's date range
    const today = getStartOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const phDate = getPhilippinesDate();
    console.log(colors.bold('📅 DATE INFORMATION:'));
    console.log(`   Philippines Time: ${phDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
    console.log(`   Start of Day: ${today.toISOString()}`);
    console.log(`   End of Day: ${tomorrow.toISOString()}`);
    console.log('');
    
    // Check today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
      archived: false
    }).lean();
    
    console.log(colors.bold(`📊 TODAY'S ATTENDANCE (${phDate.toLocaleDateString('en-PH')}):`));
    console.log(`   Total Records: ${todayAttendance.length}`);
    
    if (todayAttendance.length > 0) {
      let present = 0;
      let fullDay = 0;
      let halfDay = 0;
      let invalid = 0;
      
      console.log('');
      console.log(colors.bold('   📝 Attendance Details:'));
      
      todayAttendance.forEach((record, index) => {
        const hasTimeOut = !!record.timeOut;
        const status = record.status || 'unknown';
        
        console.log(`   ${index + 1}. Employee: ${record.employeeId}`);
        console.log(`      Time In: ${record.timeIn ? new Date(record.timeIn).toLocaleString('en-PH') : 'N/A'}`);
        console.log(`      Time Out: ${record.timeOut ? new Date(record.timeOut).toLocaleString('en-PH') : 'Not yet'}`);
        console.log(`      Status: ${status}`);
        console.log(`      Day Type: ${record.dayType || 'N/A'}`);
        
        if (record.timeIn) {
          if (hasTimeOut) {
            if (status === 'full-day' || status === 'overtime') fullDay++;
            else if (status === 'half-day') halfDay++;
            else if (status === 'invalid') invalid++;
          } else {
            present++;
          }
        }
      });
      
      console.log('');
      console.log(colors.bold('   📈 Calculated Stats:'));
      console.log(`      Present (working): ${colors.green(present)}`);
      console.log(`      Full Day: ${colors.green(fullDay)}`);
      console.log(`      Half Day: ${colors.yellow(halfDay)}`);
      console.log(`      Invalid: ${colors.red(invalid)}`);
      console.log(`      Absent: ${colors.red(activeEmployees - present - fullDay - halfDay - invalid)}`);
    } else {
      console.log(colors.yellow('   ⚠️ No attendance records for today!'));
      console.log(colors.yellow(`   All ${activeEmployees} active employees are ABSENT`));
    }
    
    console.log('');
    
    // Check recent attendance (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentAttendance = await Attendance.find({
      date: { $gte: sevenDaysAgo },
      archived: false
    }).select('date employeeId').lean();
    
    console.log(colors.bold('📅 RECENT ATTENDANCE (Last 7 Days):'));
    console.log(`   Total Records: ${recentAttendance.length}`);
    
    // Group by date
    const byDate = {};
    recentAttendance.forEach(record => {
      const dateStr = new Date(record.date).toLocaleDateString('en-PH');
      byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    });
    
    console.log('');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`   ${date}: ${byDate[date]} records`);
    });
    
    console.log('');
    console.log(colors.cyan('================================='));
    console.log(colors.green('✅ Database analysis complete'));
    
  } catch (error) {
    console.error(colors.red('❌ Error:'), error.message);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

// Run the check
checkDatabase();
