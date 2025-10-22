import express from "express";
import Salary from "../models/SalaryModel.js";
import Employee from "../models/EmployeeModels.js"; // para auto-fill Name & Status

const router = express.Router();

// 🔍 Get employee details by employeeId (for auto-fill)
router.get("/employee/:id", async (req, res) => {
  try {
    // ✅ PERFORMANCE FIX: Use lean() and select only needed fields
    const employee = await Employee.findOne({ employeeId: req.params.id })
      .select('firstName lastName status')
      .lean()
      .exec();
      
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({
      name: `${employee.firstName} ${employee.lastName}`,
      status: employee.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching employee", error });
  }
});

// ➕ Add new salary record
router.post("/", async (req, res) => {
  try {
    const { employeeId, salary, date } = req.body;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const newSalary = new Salary({
      employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      salary,
      status: employee.status,
      date,
    });

    await newSalary.save();
    res.status(201).json({ message: "Salary saved successfully", data: newSalary });
  } catch (error) {
    console.error("Error saving salary:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// 📋 Get all salary records
router.get("/", async (req, res) => {
  try {
    // ✅ PERFORMANCE FIX: Use lean() and field selection for faster queries
    const salaries = await Salary.find()
      .select('-__v') // Exclude version key
      .sort({ date: -1 })
      .lean() // Convert to plain objects for faster JSON serialization
      .exec();
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: "Error fetching salaries", error });
  }
});

// ✏️ Update salary record
router.put("/:id", async (req, res) => {
  try {
    const { employeeId, salary, date } = req.body;

    const updatedSalary = await Salary.findByIdAndUpdate(
      req.params.id,
      { employeeId, salary, date },
      { new: true, runValidators: true }
    );

    if (!updatedSalary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    res.json({ message: "Salary updated successfully", data: updatedSalary });
  } catch (error) {
    console.error("Error updating salary:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// 🗂️ Archive/Restore salary record
router.patch("/:id", async (req, res) => {
  try {
    const { archived } = req.body;

    const updatedSalary = await Salary.findByIdAndUpdate(
      req.params.id,
      { archived },
      { new: true, runValidators: true }
    );

    if (!updatedSalary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    res.json({ message: "Salary record updated successfully", data: updatedSalary });
  } catch (error) {
    console.error("Error updating salary:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;
