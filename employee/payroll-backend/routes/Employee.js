import express from 'express';
import Employee from '../models/EmployeeModels.js';
import Attendance from '../models/AttendanceModels.js';
import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmployeeCredentialsEmail } from '../services/emailService.js';
import { getPaginationParams, createPaginatedResponse, optimizeMongooseQuery } from '../utils/paginationHelper.js';
import { setCacheHeaders } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Generate a secure temporary password that meets complexity requirements
function generateTempPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';

  // Start with guaranteed characters of each type
  let password = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)]
  ];

  // Add more random characters to make it 8-10 characters
  const allChars = uppercase + lowercase + numbers;
  const additionalChars = Math.floor(Math.random() * 3) + 5; // 5-7 more chars

  for (let i = 0; i < additionalChars; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the array
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

// GET all employees - OPTIMIZED with pagination and caching
router.get('/', setCacheHeaders(300), async (req, res) => {
  try {
    // Check if pagination is requested
    const { page, limit, skip } = getPaginationParams(req.query);
    
    // If pagination requested (page param exists), use paginated response
    if (req.query.page) {
      const totalCount = await Employee.countDocuments();
      
      // Optimized query with lean() and select()
      const employees = await optimizeMongooseQuery(
        Employee.find(),
        {
          lean: true,
          select: '-__v', // Exclude version key
          limit,
          skip,
          sort: '-createdAt'
        }
      );
      
      const response = createPaginatedResponse(employees, totalCount, { page, limit });
      return res.json(response);
    }
    
    // Default: Return all employees (for backward compatibility)
    // But optimize the query with lean() for better performance
    const employees = await Employee.find()
      .select('-__v')  // Exclude version key only, don't force plainTextPassword
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(employees);
  } catch (err) {
    console.error('❌ Error in GET /api/employees:', err);
    res.status(500).json({ message: 'Failed to fetch employees', error: err.message });
  }
});

// POST new employee (WITH FINGERPRINT SUPPORT)
router.post('/', async (req, res) => {
  try {
    console.log('=== EMPLOYEE CREATION REQUEST ===');
    console.log('Received employee data:', JSON.stringify(req.body, null, 2));
    
    // Normalize hire date support (accept either hireDate or date from frontend)
    const normalizedHireDate = req.body.hireDate || req.body.date;

    // Check if all required fields are present
    const requiredFields = ['firstName', 'lastName', 'email', 'contactNumber'];
    const missingFields = requiredFields.filter(field => req.body[field] == null || req.body[field] === '');
    if (!normalizedHireDate) missingFields.push('hireDate');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: missingFields 
      });
    }
    
    console.log('All required fields present');
    console.log('Hire date received:', normalizedHireDate);

    // Auto-generate employeeId if missing
    let employeeId = (req.body.employeeId || '').trim();
    if (!employeeId) {
      // Use timestamp-based ID for uniqueness
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      employeeId = `EMP${timestamp}${randomSuffix}`;
      console.log('Auto-generated employeeId:', employeeId);
    }

    // Use password from GUI if provided, otherwise generate temp
    const providedPassword = req.body.password;
    const tempPassword = providedPassword || generateTempPassword();
    
    // Use plainTextPassword from request if provided, otherwise use tempPassword
    const plainTextPassword = req.body.plainTextPassword || tempPassword;
    
    console.log('🔑 Password handling:');
    console.log('   - providedPassword:', providedPassword ? providedPassword.substring(0, 5) + '...' : 'NONE');
    console.log('   - tempPassword:', tempPassword.substring(0, 5) + '...');
    console.log('   - plainTextPassword:', plainTextPassword ? plainTextPassword.substring(0, 5) + '...' : 'NONE');
    console.log('   - req.body.plainTextPassword:', req.body.plainTextPassword ? req.body.plainTextPassword.substring(0, 5) + '...' : 'NONE');

    // Determine if this is from GUI (fingerprintEnrolled indicates GUI registration)
    const isFromGUI = req.body.fingerprintEnrolled === true;
    const passwordChanged = !isFromGUI; // GUI registrations use temp password, require change

    const newEmployee = new Employee({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      employeeId: employeeId,
      contactNumber: req.body.contactNumber,
      status: req.body.status || 'regular',
      position: req.body.position,
      department: req.body.department || '',
      salary: req.body.salary || 0,
      hireDate: normalizedHireDate,
      // 💰 SALARY RATE FIELDS (Phase 1 Enhancement)
      employmentType: req.body.employmentType || (req.body.status === 'regular' ? 'Regular' : 'On-Call'),
      dailyRate: req.body.dailyRate || 550,
      hourlyRate: req.body.hourlyRate || 68.75,
      overtimeRate: req.body.overtimeRate || 85.94,
      // ✅ FINGERPRINT FIELDS
      fingerprintEnrolled: req.body.fingerprintEnrolled || false,
      fingerprintTemplate: req.body.fingerprintTemplate || null,
      // ACCOUNT FIELDS
      username: req.body.username || employeeId,
      password: tempPassword, // Set plain password - pre-save hook will hash it
      plainTextPassword: plainTextPassword, // ✅ CRITICAL: Set plain text for email sending
      isActive: true,
      passwordChanged: passwordChanged
    });

    console.log('📝 Created employee object:');
    console.log('   - plainTextPassword:', newEmployee.plainTextPassword ? newEmployee.plainTextPassword.substring(0, 5) + '...' : 'UNDEFINED!!!');
    console.log('   - password (plain, will be hashed):', newEmployee.password.substring(0, 10) + '...');
    
    // CRITICAL FIX: Explicitly set plainTextPassword again to ensure it's not stripped
    console.log('🔧 Force-setting plainTextPassword before save...');
    newEmployee.plainTextPassword = plainTextPassword;
    console.log('🔧 After force-set, plainTextPassword:', newEmployee.plainTextPassword ? newEmployee.plainTextPassword.substring(0, 5) + '...' : 'STILL UNDEFINED!!!');
    
    // Mark the field as modified to ensure Mongoose saves it
    newEmployee.markModified('plainTextPassword');
    console.log('🔧 Marked plainTextPassword as modified');
    
    // Don't hash the password here - let the pre-save hook do it
    // This way the hook can properly set plainTextPassword if needed
    
    console.log('💾 Saving employee to database...');
    const savedEmployee = await newEmployee.save();
    console.log('✅ Employee saved successfully');
    console.log('📝 After save - savedEmployee.plainTextPassword:', savedEmployee.plainTextPassword ? savedEmployee.plainTextPassword.substring(0, 5) + '...' : 'UNDEFINED!!!');
    
    // CRITICAL FIX: ALWAYS update plainTextPassword directly in database to ensure it's saved
    // Mongoose shows it in memory but doesn't actually save it to DB
    console.log('🔧 Force-updating plainTextPassword directly in database (bypass Mongoose)...');
    const updateResult = await Employee.updateOne(
      { _id: savedEmployee._id },
      { $set: { plainTextPassword: plainTextPassword } }
    );
    console.log('✅ Direct database update result:', updateResult.matchedCount, 'matched,', updateResult.modifiedCount, 'modified');
    
    // Verify plainTextPassword was actually saved to database
    // Use lean() and direct query to bypass Mongoose schema filtering
    console.log('🔍 Verifying plainTextPassword in database...');
    const verifyEmployee = await Employee.findById(savedEmployee._id).select('+plainTextPassword').lean();
    
    // Also try direct MongoDB query as backup
    const directQuery = await Employee.collection.findOne({ _id: savedEmployee._id });
    
    console.log('🔍 Database verification:');
    console.log('   - plainTextPassword (Mongoose):', verifyEmployee.plainTextPassword ? verifyEmployee.plainTextPassword : 'NOT FOUND');
    console.log('   - plainTextPassword (Direct MongoDB):', directQuery.plainTextPassword ? directQuery.plainTextPassword : 'NOT FOUND');
    console.log('   - email:', verifyEmployee.email);
    
    // Use plainTextPassword from direct query or from memory
    const finalPassword = directQuery.plainTextPassword || verifyEmployee.plainTextPassword || plainTextPassword;
    console.log('   - Final password to use for email:', finalPassword ? finalPassword.substring(0, 5) + '...' : 'NONE!!!');

    // ✅ SEND CREDENTIALS EMAIL TO NEW EMPLOYEE
    if (verifyEmployee.email && finalPassword) {
      console.log('📧 Sending credentials email to:', verifyEmployee.email);
      const emailData = {
        firstName: verifyEmployee.firstName,
        lastName: verifyEmployee.lastName,
        employeeId: verifyEmployee.employeeId,
        username: verifyEmployee.username,
        plainTextPassword: finalPassword,
        email: verifyEmployee.email
      };
      
      const emailResult = await sendEmployeeCredentialsEmail(emailData);
      
      if (emailResult.success) {
        console.log('✅ Credentials email sent successfully');
      } else {
        console.log('⚠️ Failed to send credentials email:', emailResult.message);
        // Don't fail employee creation if email fails - just log it
      }
    } else {
      console.log('⚠️ Skipping email: Missing email address or plainTextPassword');
    }

    // Prepare response with temporary credentials if needed
    const response = {
      ...savedEmployee.toObject(),
      temporaryCredentials: isFromGUI ? {
        username: savedEmployee.username,
        password: tempPassword,
        message: 'Please change your password on first login for security.'
      } : null,
      emailSent: verifyEmployee.email && verifyEmployee.plainTextPassword // ✅ Indicate if email was sent
    };

    res.status(201).json(response);
  } catch (err) {
    console.error('=== EMPLOYEE CREATION ERROR ===');
    console.error('Error creating employee:', err);
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }));
      console.error('Formatted validation errors:', validationErrors);
    }
    
    // Send more detailed error information
    res.status(400).json({ 
      message: 'Failed to create employee', 
      error: err.message,
      errorName: err.name,
      details: err.errors ? Object.keys(err.errors).map(key => err.errors[key].message) : null
    });
  }
});

// GET a single employee by ID
router.get('/:id', async (req, res) => {
  try {
    // ✅ FIX ISSUE 1: CRITICAL - Include profilePicture in employee data response
    // This field must be explicitly selected to ensure it's returned to frontend
    const employee = await Employee.findById(req.params.id)
      .select('+plainTextPassword +profilePicture')
      .lean(); // Convert to plain object to avoid Mongoose document issues
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    console.log('📸 Employee data fetched, profilePicture exists:', !!employee.profilePicture);
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch employee', error: err.message });
  }
});

// UPDATE an employee by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(updatedEmployee);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update employee', error: err.message });
  }
});

// DELETE an employee by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete employee', error: err.message });
  }
});

// ✅ FINGERPRINT ROUTES

// Save fingerprint template
router.post('/:id/fingerprint', async (req, res) => {
  try {
    const { fingerprintTemplate } = req.body;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        fingerprintEnrolled: true,
        fingerprintTemplate: fingerprintTemplate
      },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employee not found' 
      });
    }

    res.json({
      success: true,
      message: 'Fingerprint saved successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error saving fingerprint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save fingerprint' 
    });
  }
});

// Verify fingerprint (for attendance/login)
router.post('/verify/fingerprint', async (req, res) => {
  try {
    const { fingerprintTemplate } = req.body;

    // Find employee with matching fingerprint template
    const employee = await Employee.findOne({ 
      fingerprintTemplate,
      fingerprintEnrolled: true 
    });

    if (employee) {
      res.json({
        success: true,
        matched: true,
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email
        }
      });
    } else {
      res.json({
        success: true,
        matched: false,
        message: 'No matching fingerprint found'
      });
    }

  } catch (error) {
    console.error('Error verifying fingerprint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify fingerprint' 
    });
  }
});

// POST backfill employee IDs for records missing employeeId
router.post('/backfill-ids', async (req, res) => {
  try {
    // Collect existing non-empty IDs
    const existing = await Employee.find({ employeeId: { $exists: true, $ne: '' } }).select('employeeId');
    const used = new Set(existing.map(e => (e.employeeId || '').toUpperCase()));

    // Find max sequence from EMP### pattern
    let maxSeq = 0;
    used.forEach(id => {
      const m = /^EMP(\d+)$/.exec(id);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
      }
    });

    // Find employees missing ID
    const toUpdate = await Employee.find({ $or: [{ employeeId: { $exists: false } }, { employeeId: '' }] });
    const updated = [];

    for (const emp of toUpdate) {
      // Generate next unique ID
      let candidate;
      do {
        maxSeq += 1;
        candidate = `EMP${String(maxSeq).padStart(3, '0')}`;
      } while (used.has(candidate));
      emp.employeeId = candidate;
      used.add(candidate);
      await emp.save();
      updated.push({ _id: emp._id, employeeId: emp.employeeId, firstName: emp.firstName, lastName: emp.lastName });
    }

    res.json({ updatedCount: updated.length, updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to backfill employee IDs', error: err.message });
  }
});

// POST create employee account
router.post('/:id/create-account', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if account already exists
    if (employee.username) {
      return res.status(400).json({ message: 'Account already exists for this employee' });
    }

    // Generate username if not provided (use employeeId)
    const finalUsername = username || employee.employeeId;
    
    // Generate password if not provided
    const finalPassword = password || 'temp123';

    // Update employee with account details (use updateOne to bypass pre-save hook)
    await Employee.updateOne(
      { _id: id },
      {
        $set: {
          username: finalUsername,
          password: finalPassword,
          isActive: true,
          passwordChanged: false
        }
      }
    );

    res.json({ 
      message: 'Account created successfully',
      username: finalUsername,
      password: finalPassword,
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`
    });
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ message: 'Failed to create account', error: err.message });
  }
});

// POST employee login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
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
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Login attempt for user:', username);
    console.log('Employee found:', employee.firstName, employee.lastName, '(ID:', employee.employeeId + ')');
    console.log('Stored hashed password starts with:', employee.password.substring(0, 20) + '...');
    console.log('Password provided by user (first 3 chars):', password.substring(0, 3) + '...');
    const isPasswordValid = await employee.comparePassword(password);
    console.log('Password validation result:', isPasswordValid);
    console.log('====================');
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    // Check if password needs to be changed
    const requiresPasswordChange = !employee.passwordChanged;

    res.json({
      message: 'Login successful',
      requiresPasswordChange,
      employee: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        position: employee.position,
        department: employee.department,
        salary: employee.salary,
        hireDate: employee.hireDate,
        passwordChanged: employee.passwordChanged
      }
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// PUT change password
router.put('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Validate new password complexity
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Verify current password (always use bcrypt compare since password is always hashed)
    console.log('=== CHANGE PASSWORD ATTEMPT ===');
    console.log('Change password attempt for employee:', id);
    console.log('Employee:', employee.firstName, employee.lastName, '(ID:', employee.employeeId + ')');
    console.log('Current stored password hash starts with:', employee.password.substring(0, 20) + '...');
    console.log('Current password provided (first 3 chars):', currentPassword.substring(0, 3) + '...');
    const isCurrentPasswordValid = await employee.comparePassword(currentPassword);
    console.log('Current password validation result:', isCurrentPasswordValid);
    console.log('New password provided (first 3 chars):', newPassword.substring(0, 3) + '...');

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('New password hashed successfully, hash starts with:', hashedPassword.substring(0, 20) + '...');

    // Update password and mark as changed using findByIdAndUpdate with runValidators: false to bypass pre-save hook
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      {
        password: hashedPassword,
        passwordChanged: true
      },
      {
        new: true,
        runValidators: false  // This bypasses the pre-save hook
      }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('Password updated successfully for employee:', updatedEmployee.firstName, updatedEmployee.lastName);
    console.log('Updated password hash starts with:', updatedEmployee.password.substring(0, 20) + '...');

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
});

// ATTENDANCE ROUTES

// GET all attendance records
router.get('/attendance', async (req, res) => {
  try {
    const { employeeId } = req.query;
    const query = employeeId ? { employeeId } : {};
    const attendance = await Attendance.find(query).sort({ timestamp: -1 });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

// POST log attendance
router.post('/attendance', async (req, res) => {
  try {
    const { employeeId, type, notes } = req.body;

    if (!employeeId || !type) {
      return res.status(400).json({ message: 'Employee ID and type are required' });
    }

    if (!['in', 'out'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "in" or "out"' });
    }

    const attendance = new Attendance({
      employeeId,
      type,
      notes: notes || '',
    });

    const saved = await attendance.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to log attendance', error: err.message });
  }
});

// POST time clock - launches biometric identification
router.post('/time-clock', async (req, res) => {
  try {
    // Path to the biometric script
    const scriptPath = path.join(process.cwd(), '..', 'Biometric_connect', 'main.py');

    // Spawn the Python process with time-clock mode
    const pythonProcess = spawn('python', [scriptPath, '--mode', 'time-clock'], {
      stdio: 'inherit', // Inherit stdio to show GUI
      cwd: path.dirname(scriptPath)
    });

    // Handle process events
    pythonProcess.on('close', (code) => {
      console.log(`Biometric process exited with code ${code}`);
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start biometric process:', err);
    });

    res.json({ message: 'Biometric time clock launched' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to launch time clock', error: err.message });
  }
});

// PUT update profile picture
router.put('/:employeeId/profile-picture', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture data is required' });
    }

    console.log('📸 Received profile picture update request');
    console.log('   Employee ID:', employeeId);
    console.log('   Profile picture data length:', profilePicture ? profilePicture.length : 0);
    console.log('   Profile picture preview:', profilePicture ? profilePicture.substring(0, 50) + '...' : 'null');
    
    // CRITICAL FIX: Use findOneAndUpdate with $set to bypass pre-save hooks
    // This prevents the pre-save hook from interfering with the profilePicture field
    const updatedEmployee = await Employee.findOneAndUpdate(
      { employeeId },
      { $set: { profilePicture: profilePicture } },
      { 
        new: true,  // Return the updated document
        runValidators: false,  // Skip validators for this update
        select: 'profilePicture employeeId firstName lastName'  // Only select needed fields
      }
    );
    
    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    console.log('📸 Profile picture saved via findOneAndUpdate');
    console.log('📸 After save - profile picture in DB:', updatedEmployee.profilePicture ? updatedEmployee.profilePicture.length : 0);
    console.log('📸 Returning profile picture to frontend:', updatedEmployee.profilePicture ? updatedEmployee.profilePicture.substring(0, 50) + '...' : 'null');

    // Set cache headers for profile pictures (7 days)
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days = 604800 seconds

    res.json({ 
      message: 'Profile picture updated successfully',
      profilePicture: updatedEmployee.profilePicture 
    });
  } catch (err) {
    console.error('Error updating profile picture:', err);
    res.status(500).json({ message: 'Failed to update profile picture', error: err.message });
  }
});

export default router;
