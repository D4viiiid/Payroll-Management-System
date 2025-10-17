import express from "express";
import {
  getAllEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.ctrl.js";
import Employee from "../models/EmployeeModels.js";

const router = express.Router();

// GET all employees
router.get("/", getAllEmployee);
// GET a single employee by ID
router.get("/:id", getEmployee);
// UPDATE an employee by ID
router.put("/:id", updateEmployee);
// DELETE an employee by ID
router.delete("/:id", deleteEmployee);

// Save fingerprint template
router.post("/:id/fingerprint", async (req, res) => {
  try {
    const { fingerprintTemplate } = req.body;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        fingerprintEnrolled: true,
        fingerprintTemplate: fingerprintTemplate,
      },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    res.json({
      success: true,
      message: "Fingerprint saved successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Error saving fingerprint:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save fingerprint",
    });
  }
});

// Verify fingerprint (for attendance/login)
router.post("/verify/fingerprint", async (req, res) => {
  try {
    const { fingerprintTemplate } = req.body;

    // Find employee with matching fingerprint template
    const employee = await Employee.findOne({
      fingerprintTemplate,
      fingerprintEnrolled: true,
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
          email: employee.email,
        },
      });
    } else {
      res.json({
        success: true,
        matched: false,
        message: "No matching fingerprint found",
      });
    }
  } catch (error) {
    console.error("Error verifying fingerprint:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify fingerprint",
    });
  }
});

// POST backfill employee IDs for records missing employeeId
router.post("/backfill-ids", async (req, res) => {
  try {
    // Collect existing non-empty IDs
    const existing = await Employee.find({
      employeeId: { $exists: true, $ne: "" },
    }).select("employeeId");
    const used = new Set(
      existing.map((e) => (e.employeeId || "").toUpperCase())
    );

    // Find max sequence from EMP### pattern
    let maxSeq = 0;
    used.forEach((id) => {
      const m = /^EMP(\d+)$/.exec(id);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) maxSeq = Math.max(maxSeq, n);
      }
    });

    // Find employees missing ID
    const toUpdate = await Employee.find({
      $or: [{ employeeId: { $exists: false } }, { employeeId: "" }],
    });
    const updated = [];

    for (const emp of toUpdate) {
      // Generate next unique ID
      let candidate;
      do {
        maxSeq += 1;
        candidate = `EMP${String(maxSeq).padStart(3, "0")}`;
      } while (used.has(candidate));
      emp.employeeId = candidate;
      used.add(candidate);
      await emp.save();
      updated.push({
        _id: emp._id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
      });
    }

    res.json({ updatedCount: updated.length, updated });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to backfill employee IDs", error: err.message });
  }
});

// POST create employee account
router.post("/:id/create-account", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if account already exists
    if (employee.username) {
      return res
        .status(400)
        .json({ message: "Account already exists for this employee" });
    }

    // Generate username if not provided (use employeeId)
    const finalUsername = username || employee.employeeId;

    // Generate password if not provided
    const finalPassword = password || "temp123";

    // Update employee with account details
    employee.username = finalUsername;
    employee.password = finalPassword;
    employee.isActive = true;
    employee.passwordChanged = false;

    await employee.save();

    res.json({
      message: "Account created successfully",
      username: finalUsername,
      password: finalPassword,
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
    });
  } catch (err) {
    console.error("Error creating account:", err);
    res
      .status(500)
      .json({ message: "Failed to create account", error: err.message });
  }
});

// POST employee login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find employee by username or employeeId
    const employee = await Employee.findOne({
      $or: [{ username: username }, { employeeId: username }],
      isActive: true,
    });

    if (!employee) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await employee.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    res.json({
      message: "Login successful",
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
        passwordChanged: employee.passwordChanged,
      },
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// PUT change password
router.put("/:id/change-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await employee.comparePassword(
      currentPassword
    );
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    employee.password = newPassword;
    employee.passwordChanged = true;
    await employee.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res
      .status(500)
      .json({ message: "Failed to change password", error: err.message });
  }
});

export default router;
