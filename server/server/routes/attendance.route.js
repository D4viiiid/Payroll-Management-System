import { Router } from "express";
const router = Router();

// Create attendance record
router.post("/api/attendance", async (req, res) => {
  try {
    const { employeeId, employeeName, timestamp, type, deviceType, location } =
      req.body;

    const attendance = new Attendance({
      employeeId,
      employeeName,
      timestamp: new Date(timestamp),
      type: type || "check_in",
      deviceType: deviceType || "biometric",
      location: location || "Main Office",
    });

    await attendance.save();
    res.status(201).json({
      message: "Attendance recorded successfully",
      attendance,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get attendance records
router.get("/api/attendance", async (req, res) => {
  try {
    const attendance = await Attendance.find().sort({ timestamp: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance for specific employee
router.get("/api/attendance/:employeeId", async (req, res) => {
  try {
    const attendance = await Attendance.find({
      employeeId: req.params.employeeId,
    }).sort({ timestamp: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
