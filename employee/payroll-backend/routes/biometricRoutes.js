import express from "express";
import { spawn } from "child_process";
import path from "path";
import Employee from "../models/EmployeeModels.js";


const router = express.Router();

/* ------------------------------------------------------
   🩺 Health check - actually test device connectivity
------------------------------------------------------ */
router.get("/health", (req, res) => {
  // Actually test if biometric device is accessible
  const pythonScript = path.resolve(
    "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\Biometric_connect\\capture_fingerprint.py"
  );

  // Quick test - try to run the script with health check flag
  // Increased timeout for low-end processors
  const testProcess = spawn("py", [pythonScript, "--health"], {
    stdio: "pipe",
    timeout: 8000 // 8 second timeout for slower processors
  });

  let hasResponded = false;

  // Set a timeout to respond if the process takes too long
  const timeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true;
      testProcess.kill('SIGTERM');
      res.json({
        status: "unknown",
        message: "Device status unknown - taking too long to respond",
        connected: false
      });
    }
  }, 3000);

  testProcess.on('close', (code, signal) => {
    if (hasResponded) return;
    hasResponded = true;
    clearTimeout(timeout);

    if (signal === 'SIGTERM') {
      // Process was killed by timeout
      res.json({
        status: "timeout",
        message: "Device check timed out",
        connected: false
      });
    } else if (code === 0) {
      // Process completed successfully - device is likely available
      res.json({
        status: "connected",
        message: "✅ Biometric device is connected and responding",
        connected: true
      });
    } else {
      // Process failed - device not available
      res.json({
        status: "disconnected",
        message: "❌ Biometric device not found or not responding",
        connected: false
      });
    }
  });

  testProcess.on('error', (error) => {
    if (hasResponded) return;
    hasResponded = true;
    clearTimeout(timeout);

    res.json({
      status: "error",
      message: `❌ Device check failed: ${error.message}`,
      connected: false
    });
  });

  // If the process doesn't respond within 3 seconds, kill it
  setTimeout(() => {
    if (!hasResponded) {
      testProcess.kill('SIGTERM');
    }
  }, 2500);
});

/* ------------------------------------------------------
   🔗 Connect to biometric device and capture fingerprint
------------------------------------------------------ */
router.post("/connect", (req, res) => {
  try {
    const pythonScript = path.resolve(
      "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\Biometric_connect\\capture_fingerprint.py"
    );

    // Spawn Python script for fingerprint capture
    // Increased timeout for low-end processors
    const process = spawn("py", [pythonScript], {
      stdio: "pipe",
      timeout: 25000 // 25 second timeout for slower processors
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      try {
        if (code === 0) {
          // Parse the JSON response from Python script
          const result = JSON.parse(stdout.trim());

          if (result.success) {
            // Send the captured fingerprint template to attendance/record
            const attendanceData = {
              fingerprint_template: result.fingerprint_template
            };

            // Make internal request to attendance/record endpoint
            const http = require('http');
            const postData = JSON.stringify(attendanceData);

            const options = {
              hostname: 'localhost',
              port: 5000,
              path: '/api/attendance/record',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              }
            };

            const req = http.request(options, (attendanceRes) => {
              let attendanceData = '';

              attendanceRes.on('data', (chunk) => {
                attendanceData += chunk;
              });

              attendanceRes.on('end', () => {
                try {
                  const attendanceResult = JSON.parse(attendanceData);

                  if (attendanceResult.error) {
                    res.status(400).json({
                      success: false,
                      error: attendanceResult.error,
                      message: "Fingerprint captured but attendance recording failed"
                    });
                  } else {
                    res.json({
                      success: true,
                      message: "Fingerprint captured and attendance recorded successfully",
                      attendance: attendanceResult
                    });
                  }
                } catch (parseError) {
                  res.status(500).json({
                    success: false,
                    error: "Failed to parse attendance response",
                    details: attendanceData
                  });
                }
              });
            });

            req.on('error', (error) => {
              res.status(500).json({
                success: false,
                error: "Failed to record attendance",
                details: error.message
              });
            });

            req.write(postData);
            req.end();

          } else {
            res.status(400).json({
              success: false,
              error: result.error || "Fingerprint capture failed"
            });
          }
        } else {
          res.status(500).json({
            success: false,
            error: "Fingerprint capture process failed",
            details: stderr
          });
        }
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: "Failed to parse fingerprint capture response",
          details: stdout || stderr
        });
      }
    });

    process.on("error", (error) => {
      res.status(500).json({
        success: false,
        error: "Failed to start fingerprint capture process",
        details: error.message
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Biometric device connection failed",
      details: error.message
    });
  }
});



/* ------------------------------------------------------
   ✋ Enroll biometric (trigger Python script)
------------------------------------------------------ */
router.post("/enroll", async (req, res) => {
  const { employee_id, name } = req.body;
  if (!employee_id || !name) {
    return res.status(400).json({ message: "Missing employee_id or name" });
  }

  // Find employee by employeeId
  const employee = await Employee.findOne({ employeeId: employee_id });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  console.log("📦 Launching Python for:", employee._id, employee.firstName, employee.lastName);

  const pythonScript = path.resolve(
    "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\biometric_connect\\main.py"
  );

  // 🧠 Spawn Python script
  const process = spawn("py", [
    pythonScript,
    employee._id.toString(),
    `${employee.firstName} ${employee.lastName}`,
  ], { stdio: "inherit" });

  res.json({ message: "Fingerprint app opened for enrollment." });
});

/* ------------------------------------------------------
   📥 Callback from Python → update MongoDB
------------------------------------------------------ */
router.post("/callback", async (req, res) => {
  try {
    console.log("📥 Callback received from Python:", req.body);

    const { employeeId, status, fingerprintData } = req.body;

    // ✅ Validate data
    if (!employeeId) {
      return res.status(400).json({ message: "Missing employeeId" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      console.log("⚠️ Employee not found:", employeeId);
      return res.status(404).json({ message: "Employee not found" });
    }

    if (status === "success") {
      // ✅ Update the employee’s biometric info
      employee.biometricStatus = "enrolled";
      employee.fingerprintEnrolled = true;
      employee.fingerprintData = fingerprintData || null;
      await employee.save();

      console.log(`✅ Employee ${employee.firstName} ${employee.lastName} enrolled successfully`);
      res.json({ message: "Employee updated successfully", employee });
    } else {
      console.log("❌ Enrollment failed for employee:", employeeId);
      employee.biometricStatus = "failed";
      await employee.save();
      res.status(400).json({ message: "Enrollment failed" });
    }
  } catch (error) {
    console.error("🚨 Callback error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
