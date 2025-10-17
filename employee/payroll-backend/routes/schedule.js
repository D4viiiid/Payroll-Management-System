import express from 'express';
const router = express.Router();
import Schedule from '../models/Schedule.model.js';
import Employee from '../models/EmployeeModels.js';

/**
 * 📅 Schedule Management Routes
 * Manage daily employee schedules (2 regular + 3 on-call)
 */

// GET all schedules with optional filters
router.get('/schedules', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = {};
    
    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.date = { $gte: start, $lte: end };
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    const schedules = await Schedule.find(query)
      .sort({ date: 1 })
      .populate('regularEmployees.employee', 'firstName lastName employeeId')
      .populate('onCallEmployees.employee', 'firstName lastName employeeId')
      .populate('createdBy', 'firstName lastName')
      .populate('publishedBy', 'firstName lastName');
    
    console.log(`✅ Retrieved ${schedules.length} schedules`);
    
    res.json({
      success: true,
      count: schedules.length,
      schedules
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET schedule for specific date
router.get('/schedules/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const schedule = await Schedule.getScheduleForDate(date);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'No schedule found for this date'
      });
    }
    
    console.log(`✅ Retrieved schedule for ${date}`);
    
    res.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedule for date:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET schedule by ID
router.get('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('regularEmployees.employee', 'firstName lastName employeeId')
      .populate('onCallEmployees.employee', 'firstName lastName employeeId')
      .populate('createdBy', 'firstName lastName')
      .populate('publishedBy', 'firstName lastName');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    console.log(`✅ Retrieved schedule ${req.params.id}`);
    
    res.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET employee's schedules
router.get('/schedules/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Default to next 30 days if not specified
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const schedules = await Schedule.getEmployeeSchedules(employeeId, start, end);
    
    console.log(`✅ Retrieved ${schedules.length} schedules for employee ${employeeId}`);
    
    res.json({
      success: true,
      count: schedules.length,
      schedules
    });
    
  } catch (error) {
    console.error('❌ Error fetching employee schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET schedule statistics
router.get('/schedules/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to current month if not specified
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    
    const stats = await Schedule.getStatistics(start, end);
    
    console.log(`✅ Retrieved schedule statistics`);
    
    res.json({
      success: true,
      period: { startDate: start, endDate: end },
      stats
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedule statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST create new schedule
router.post('/schedules', async (req, res) => {
  try {
    const { date, regularEmployees, onCallEmployees, createdBy, notes } = req.body;
    
    // Validate required fields
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }
    
    // Check if schedule already exists for this date
    const existing = await Schedule.getScheduleForDate(date);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Schedule already exists for this date'
      });
    }
    
    // Fetch employee details for regular employees
    const regularEmpDetails = await Promise.all(
      (regularEmployees || []).map(async (empId) => {
        const employee = await Employee.findOne({ employeeId: empId });
        if (!employee) {
          throw new Error(`Employee ${empId} not found`);
        }
        return {
          employee: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          assignedAt: new Date(),
          assignedBy: createdBy
        };
      })
    );
    
    // Fetch employee details for on-call employees
    const onCallEmpDetails = await Promise.all(
      (onCallEmployees || []).map(async (item, index) => {
        const empId = typeof item === 'string' ? item : item.employeeId;
        const priority = typeof item === 'object' ? item.priority : index + 1;
        
        const employee = await Employee.findOne({ employeeId: empId });
        if (!employee) {
          throw new Error(`Employee ${empId} not found`);
        }
        return {
          employee: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          priority: priority,
          assignedAt: new Date(),
          assignedBy: createdBy,
          called: false
        };
      })
    );
    
    // Create schedule
    const schedule = new Schedule({
      date,
      regularEmployees: regularEmpDetails,
      onCallEmployees: onCallEmpDetails,
      notes: notes || '',
      createdBy,
      status: 'Draft'
    });
    
    // Validate before saving
    const validation = schedule.validateSchedule();
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule',
        validationErrors: validation.errors
      });
    }
    
    await schedule.save();
    
    console.log(`✅ Created schedule for ${date}`);
    
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error creating schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT update schedule
router.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // Don't allow editing published schedules
    if (schedule.status === 'Published') {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit published schedule'
      });
    }
    
    const { regularEmployees, onCallEmployees, notes, status } = req.body;
    
    // Update regular employees if provided
    if (regularEmployees) {
      const regularEmpDetails = await Promise.all(
        regularEmployees.map(async (empId) => {
          const employee = await Employee.findOne({ employeeId: empId });
          if (!employee) {
            throw new Error(`Employee ${empId} not found`);
          }
          return {
            employee: employee._id,
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            assignedAt: new Date()
          };
        })
      );
      schedule.regularEmployees = regularEmpDetails;
    }
    
    // Update on-call employees if provided
    if (onCallEmployees) {
      const onCallEmpDetails = await Promise.all(
        onCallEmployees.map(async (item, index) => {
          const empId = typeof item === 'string' ? item : item.employeeId;
          const priority = typeof item === 'object' ? item.priority : index + 1;
          
          const employee = await Employee.findOne({ employeeId: empId });
          if (!employee) {
            throw new Error(`Employee ${empId} not found`);
          }
          return {
            employee: employee._id,
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            priority: priority,
            assignedAt: new Date(),
            called: false
          };
        })
      );
      schedule.onCallEmployees = onCallEmpDetails;
    }
    
    if (notes !== undefined) schedule.notes = notes;
    if (status !== undefined) schedule.status = status;
    
    // Validate before saving
    const validation = schedule.validateSchedule();
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule',
        validationErrors: validation.errors
      });
    }
    
    await schedule.save();
    
    console.log(`✅ Updated schedule ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error updating schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST publish schedule
router.post('/schedules/:id/publish', async (req, res) => {
  try {
    const { publishedBy } = req.body;
    
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.publishSchedule(publishedBy);
    
    console.log(`✅ Published schedule ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Schedule published successfully',
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error publishing schedule:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST call in on-call employee
router.post('/schedules/:id/call-in', async (req, res) => {
  try {
    const { employeeId, calledBy } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'employeeId is required'
      });
    }
    
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.callInEmployee(employeeId, calledBy);
    
    console.log(`✅ Called in employee ${employeeId} for schedule ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Employee called in successfully',
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error calling in employee:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE cancel schedule
router.delete('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    schedule.status = 'Cancelled';
    await schedule.save();
    
    console.log(`✅ Cancelled schedule ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Schedule cancelled successfully',
      schedule
    });
    
  } catch (error) {
    console.error('❌ Error cancelling schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST check employee availability
router.post('/schedules/check-availability', async (req, res) => {
  try {
    const { employeeId, date } = req.body;
    
    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        error: 'employeeId and date are required'
      });
    }
    
    const available = await Schedule.isEmployeeAvailable(employeeId, date);
    
    res.json({
      success: true,
      employeeId,
      date,
      available
    });
    
  } catch (error) {
    console.error('❌ Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
