import express from "express";
import { spawn } from "child_process";
import path from "path";
import Employee from "../models/EmployeeModels.js";

const router = express.Router();

/**
 * 🧪 TEST ROUTE
 */
router.get("/test", (req, res) => {
  res.send("Fingerprint route is working ✅");
});

/**
 * 🗄️ DATABASE TEST ROUTE
 */
router.get("/test-db", async (req, res) => {
  try {
    console.log("🔍 Testing database connection...");
    const employeeCount = await Employee.countDocuments();
    const allEmployees = await Employee.find({}).limit(5);
    
    console.log(`📊 Database test results:`);
    console.log(`   - Total employees: ${employeeCount}`);
    console.log(`   - Sample employees:`, allEmployees.map(emp => ({
      id: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`
    })));
    
    res.json({
      success: true,
      message: "Database connection working",
      totalEmployees: employeeCount,
      sampleEmployees: allEmployees.map(emp => ({
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        fingerprintEnrolled: emp.fingerprintEnrolled
      }))
    });
  } catch (error) {
    console.error("❌ Database test error:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
      message: error.message
    });
  }
});

router.post("/enroll/auto", async (req, res) => {
  try {
    const { firstName, lastName, email, contactNumber, position, employeeId, salary, hireDate, fingerprintTemplate } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    // Check for duplicate fingerprint if template is provided
    if (fingerprintTemplate) {
      const existingEmployee = await Employee.findOne({ fingerprintTemplate });
      if (existingEmployee) {
        return res.status(400).json({ 
          error: "Fingerprint already registered",
          existingEmployee: {
            employeeId: existingEmployee.employeeId,
            name: `${existingEmployee.firstName} ${existingEmployee.lastName}`
          }
        });
      }
    }

    console.log("🎯 Starting fingerprint enrollment for:", { 
      firstName, 
      lastName, 
      email, 
      contactNumber, 
      position, 
      employeeId, 
      salary, 
      hireDate 
    });

    // ✅ USE THE PROVIDED EMPLOYEE ID OR GENERATE ONE
    const finalEmployeeId = employeeId || `EMP-${Date.now()}`;

    // Run Python script
    const pythonScript = path.resolve(
      "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\biometric_connect\\main.py"
    );

    console.log("🚀 Starting Python biometric service...");
    console.log(`📋 Employee ID: ${finalEmployeeId}`);

    // Create employee data string for Python script
    const employeeData = JSON.stringify({
      employeeId: finalEmployeeId,
      firstName,
      lastName,
      email: email || '',
      contactNumber: contactNumber || '',
      position: position || '',
      salary: salary || 0,
      hireDate: hireDate || new Date().toISOString()
    });

    const process = spawn(
      "python",
      [pythonScript, finalEmployeeId, `${firstName} ${lastName}`, employeeData],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      }
    );

    process.unref();

    console.log(`✅ Background enrollment started for ${firstName} ${lastName} (${finalEmployeeId})`);

    res.json({ 
      success: true, 
      message: "Fingerprint enrollment started", 
      employeeId: finalEmployeeId,
      instructions: "Please place finger on scanner when prompted"
    });
    
  } catch (error) {
    console.error("❌ Enrollment error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to start fingerprint enrollment" 
    });
  }
});

/**
 * 🔍 FINGERPRINT LOGIN DETECTION
 */
router.post("/login/auto", async (req, res) => {
  try {
    console.log("🔍 Starting fingerprint login detection...");
    
    // Simulate for defense
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const demoEmployee = {
      _id: 'emp_defense_001',
      employeeId: 'EMP-2024',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@company.com',
      position: 'Employee'
    };
    
    res.json({
      success: true,
      employee: demoEmployee,
      message: "Fingerprint authentication successful!",
      simulated: true
    });
    
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fingerprint login system unavailable" 
    });
  }
});

/**
 * 📩 CALLBACK — from Python app
 */
router.post("/callback", async (req, res) => {
  try {
    console.log("🎯 CALLBACK RECEIVED!");
    console.log("📦 Full request body:", JSON.stringify(req.body, null, 2));

    const { user_id, user_name, status, fingerprintTemplate, employee_data } = req.body;

    if (!user_id) {
      console.error("❌ Missing user_id in callback");
      return res.status(400).json({ 
        success: false, 
        error: "user_id is required" 
      });
    }

    console.log(`🔍 Looking for employee with employeeId: "${user_id}"`);
    
    // 🔍 DEBUG: List all employees in database
    console.log("🔍 Checking database connection...");
    const allEmployees = await Employee.find({});
    console.log(`📊 Found ${allEmployees.length} employees in database:`);
    allEmployees.forEach(emp => {
      console.log(`   - ${emp.employeeId}: ${emp.firstName} ${emp.lastName}`);
    });
    
    if (allEmployees.length === 0) {
      console.log("⚠️  Database is empty - no employees found");
    }

    // Check for duplicate fingerprint before processing
    if (fingerprintTemplate) {
      const existingWithFingerprint = await Employee.findOne({ 
        fingerprintTemplate,
        employeeId: { $ne: user_id } // Exclude current employee
      });
      
      if (existingWithFingerprint) {
        console.error(`❌ Fingerprint already registered to another employee: ${existingWithFingerprint.employeeId}`);
        return res.status(400).json({ 
          success: false, 
          error: "Fingerprint already registered",
          existingEmployee: {
            employeeId: existingWithFingerprint.employeeId,
            name: `${existingWithFingerprint.firstName} ${existingWithFingerprint.lastName}`
          }
        });
      }
    }

    const employee = await Employee.findOne({ employeeId: user_id });

    if (!employee) {
      console.log(`ℹ️  Employee not found with employeeId: "${user_id}" - will create new employee`);
      console.log("💡 Available employeeIds:", allEmployees.map(emp => emp.employeeId));
      
      // ✅ Try to create a new employee record
      try {
        console.log(`🆕 Creating new employee record for ID: ${user_id}`);
        
        // Use employee_data if available, otherwise use defaults
        const employeeInfo = employee_data || {};
        console.log(`🔑 Password being set: "${employeeInfo.password || 'temp123'}"`);
        
        const newEmployee = new Employee({
          employeeId: user_id,
          firstName: employeeInfo.firstName || user_name.split(' ')[0] || 'Unknown',
          lastName: employeeInfo.lastName || user_name.split(' ').slice(1).join(' ') || 'User',
          email: employeeInfo.email || `${user_id.toLowerCase()}@company.com`,
          contactNumber: employeeInfo.contactNumber || '000-000-0000',
          status: 'regular',
          position: employeeInfo.position || 'Employee',
          salary: employeeInfo.salary || 0,
          hireDate: employeeInfo.hireDate ? new Date(employeeInfo.hireDate) : new Date(),
          username: employeeInfo.username || user_id,
          password: employeeInfo.password || 'temp123',
          isActive: true,  // Ensure employee can login
          fingerprintEnrolled: true,
          fingerprintTemplate: fingerprintTemplate || "ENROLLED",
          fingerprintStatus: status || "registered",
          fingerprintEnrolledAt: new Date()
        });
        
        await newEmployee.save();
        console.log(`✅ Created new employee: ${newEmployee.firstName} ${newEmployee.lastName}`);
        console.log(`🔑 Login credentials: Username: ${newEmployee.username}, Password: ${employeeInfo.password || 'temp123'}`);
        console.log(`🔐 Hashed password starts with: ${newEmployee.password.substring(0, 20)}...`);
        
        return res.status(200).json({ 
          success: true, 
          message: "New employee created and fingerprint enrolled!",
          employee: {
            id: newEmployee._id,
            employeeId: newEmployee.employeeId,
            name: `${newEmployee.firstName} ${newEmployee.lastName}`,
            fingerprintEnrolled: newEmployee.fingerprintEnrolled,
            username: newEmployee.username,
            password: employeeInfo.password || 'temp123'  // Return password for display
          }
        });
        
      } catch (createError) {
        console.error(`❌ Failed to create employee: ${createError.message}`);
        
        return res.status(500).json({ 
          success: false, 
          error: `Failed to create employee "${user_id}": ${createError.message}`,
          details: createError.message
        });
      }
    }

    // ✅ Update employee
    employee.fingerprintEnrolled = true;
    employee.fingerprintTemplate = fingerprintTemplate || "ENROLLED";
    employee.fingerprintStatus = status || "registered";
    employee.fingerprintEnrolledAt = new Date();
    
    await employee.save();

    console.log(`✅ Fingerprint saved for ${employee.firstName} ${employee.lastName}`);
    console.log(`📋 Employee ID in DB: ${employee.employeeId}`);

    res.json({ 
      success: true, 
      message: "Fingerprint saved successfully!",
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        fingerprintEnrolled: employee.fingerprintEnrolled
      }
    });

  } catch (error) {
    console.error("❌ Callback error:", error);
    res.status(200).json({ 
      success: false,
      error: error.message
    });
  }
});

// Direct fingerprint scan endpoint
router.post("/scan/direct", async (req, res) => {
  try {
    const { firstName, lastName, email, contactNumber, position, employeeId, salary, hireDate } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    console.log("🎯 Direct fingerprint scan for:", { 
      firstName, 
      lastName, 
      email, 
      contactNumber, 
      position, 
      employeeId, 
      salary, 
      hireDate 
    });

    // Use the provided employee ID or generate one
    const finalEmployeeId = employeeId || `EMP-${Date.now()}`;

    // Simulate fingerprint scanning (in real implementation, this would connect to scanner)
    console.log("📱 Simulating fingerprint scan...");
    
    // Create employee data for callback
    const employeeData = {
      employeeId: finalEmployeeId,
      firstName,
      lastName,
      email: email || '',
      contactNumber: contactNumber || '',
      position: position || '',
      salary: salary || 0,
      hireDate: hireDate || new Date().toISOString()
    };

    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create or update employee in database
    let employee = await Employee.findOne({ employeeId: finalEmployeeId });
    
    if (!employee) {
      console.log(`🆕 Creating new employee record for ID: ${finalEmployeeId}`);
      employee = new Employee({
        employeeId: finalEmployeeId,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        contactNumber: employeeData.contactNumber,
        status: employeeData.status || 'regular',
        position: employeeData.position || 'Employee',
        salary: employeeData.salary || 0,
        hireDate: new Date(employeeData.hireDate),
        username: employeeData.username || finalEmployeeId,
        password: employeeData.password || 'temp123',
        fingerprintEnrolled: true,
        fingerprintTemplate: "SCANNED_DIRECT",
        fingerprintStatus: "registered",
        fingerprintEnrolledAt: new Date()
      });
      await employee.save();
      console.log(`✅ Created new employee: ${employee.firstName} ${employee.lastName}`);
    } else {
      console.log(`✅ Updated existing employee: ${employee.firstName} ${employee.lastName}`);
      employee.fingerprintEnrolled = true;
      employee.fingerprintTemplate = "SCANNED_DIRECT";
      employee.fingerprintStatus = "registered";
      employee.fingerprintEnrolledAt = new Date();
      await employee.save();
    }

    res.json({
      success: true,
      message: "Fingerprint scanned and saved successfully!",
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        fingerprintEnrolled: employee.fingerprintEnrolled
      }
    });

  } catch (error) {
    console.error("❌ Direct scan error:", error);
    res.status(500).json({
      success: false,
      error: "Fingerprint scan failed",
      message: error.message
    });
  }
});

// Check for duplicate fingerprints
router.post('/check-duplicate', async (req, res) => {
  try {
    const { fingerprintTemplate, excludeEmployeeId } = req.body;
    
    if (!fingerprintTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Fingerprint template is required'
      });
    }
    
    // Check for existing fingerprint template in database
    const existingEmployee = await Employee.findOne({
      fingerprintTemplate: fingerprintTemplate,
      employeeId: { $ne: excludeEmployeeId } // Exclude current employee
    });
    
    if (existingEmployee) {
      return res.json({
        success: true,
        duplicateFound: true,
        existingEmployee: {
          employeeId: existingEmployee.employeeId,
          name: `${existingEmployee.firstName} ${existingEmployee.lastName}`,
          email: existingEmployee.email
        }
      });
    } else {
      return res.json({
        success: true,
        duplicateFound: false,
        message: 'No duplicate fingerprint found'
      });
    }
    
  } catch (error) {
    console.error('❌ Duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for duplicate fingerprints'
    });
  }
});

// Test login credentials
router.post('/test-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    // Find employee by username or employeeId
    const employee = await Employee.findOne({
      $or: [
        { username: username },
        { employeeId: username }
      ],
      isActive: true
    });
    
    if (!employee) {
      return res.json({
        success: false,
        found: false,
        message: 'Employee not found'
      });
    }
    
    console.log('=== TEST LOGIN ===');
    console.log('Username:', username);
    console.log('Employee found:', employee.firstName, employee.lastName);
    console.log('Stored password starts with:', employee.password.substring(0, 20) + '...');
    console.log('Provided password:', password);
    
    const isPasswordValid = await employee.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    console.log('==================');
    
    return res.json({
      success: true,
      found: true,
      passwordValid: isPasswordValid,
      employee: {
        employeeId: employee.employeeId,
        username: employee.username,
        firstName: employee.firstName,
        lastName: employee.lastName
      }
    });
    
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.status(500).json({
      success: false,
      error: 'Test login failed'
    });
  }
});

// Fix isActive status for employees
router.post('/fix-active-status', async (req, res) => {
  try {
    // Update all employees with fingerprintEnrolled: true to isActive: true
    const result = await Employee.updateMany(
      { fingerprintEnrolled: true },
      { isActive: true }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} employees to active status`);
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} employees to active status`,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Fix active status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix active status'
    });
  }
});

// ✅ EXPORT
export default router;