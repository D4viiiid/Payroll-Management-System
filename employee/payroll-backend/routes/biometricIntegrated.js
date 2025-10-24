import express from "express";
import { spawn, spawnSync } from "child_process";
import path from "path";
import fs from 'fs';
import Employee from "../models/EmployeeModels.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Use virtual environment Python path (Windows default inside repo)
const VENV_PYTHON = path.resolve(
  process.cwd(),
  "..",
  "..",
  ".venv",
  "Scripts",
  "python.exe"
);

// Determine a runnable Python command. Prefer explicit env path, repo venv, then try 'py' and 'python'.
function testCmd(cmd, args = ['-c', 'print(1)']) {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 3000 });
    return r && r.status === 0;
  } catch (e) {
    return false;
  }
}

let PYTHON_PATH = null;
if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
  PYTHON_PATH = process.env.PYTHON_PATH;
}

if (!PYTHON_PATH && fs.existsSync(VENV_PYTHON)) {
  PYTHON_PATH = VENV_PYTHON;
}

if (!PYTHON_PATH && testCmd('py', ['-3', '-c', 'print(1)'])) {
  PYTHON_PATH = 'py';
}

if (!PYTHON_PATH && testCmd('python', ['-c', 'print(1)'])) {
  PYTHON_PATH = 'python';
}

if (!PYTHON_PATH) {
  console.warn('🐍 No python interpreter detected; falling back to "python". Please ensure Python 3.10+ is installed or set PYTHON_PATH env.');
  PYTHON_PATH = 'python';
}

console.log('🐍 Using Python command:', PYTHON_PATH);

/* ------------------------------------------------------
   🔍 Check biometric device health
   ✅ FIX: Return graceful error in production (Vercel doesn't support USB devices)
------------------------------------------------------ */
router.get("/device/health", async (req, res) => {
  try {
    // ✅ CRITICAL FIX: Vercel serverless functions cannot access local USB devices
    // Return appropriate message for production environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProduction) {
      return res.status(200).json({
        success: false,
        connected: false,
        message: "Fingerprint scanner is only available on local machines. Please download and install the bridge software on your computer.",
        productionNote: "USB biometric devices cannot be accessed from cloud servers. Install the bridge software locally.",
        downloadUrl: "/api/fingerprint-bridge/download"
      });
    }

    const pythonScript = path.resolve(
      process.cwd(),
      "..",
      "Biometric_connect",
      "integrated_capture.py"
    );

    console.log("🔍 Checking device health with script:", pythonScript);
    console.log("🐍 Using Python:", PYTHON_PATH);

    const testProcess = spawn(PYTHON_PATH, [pythonScript, "--health"], {
      stdio: "pipe",
      timeout: 15000,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let processCompleted = false;

    testProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    testProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const responseTimeout = setTimeout(() => {
      if (!processCompleted) {
        processCompleted = true;
        testProcess.kill();
        res.json({
          success: false,
          connected: false,
          message: "Device check timed out",
          error: "Timeout after 12 seconds",
        });
      }
    }, 12000);

    testProcess.on("close", (code) => {
      if (processCompleted) return;
      
      clearTimeout(responseTimeout);
      processCompleted = true;
      
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          res.json({
            success: result.success,
            connected: result.success,
            message: result.message,
          });
        } catch (e) {
          if (stdout.includes('"success": true') || stdout.includes('"success":true')) {
            res.json({
              success: true,
              connected: true,
              message: "Device connected and ready",
            });
          } else {
            res.json({
              success: false,
              connected: false,
              message: "Invalid response from device",
              error: "Could not parse device response",
            });
          }
        }
      } else if (code === 0) {
        res.json({
          success: false,
          connected: false,
          message: "Device not found or not responding",
          error: "No output from device check",
        });
      } else {
        res.json({
          success: false,
          connected: false,
          message: "Device not found or not responding",
          error: stderr || "Device check failed",
        });
      }
    });

    testProcess.on("error", (error) => {
      if (!processCompleted) {
        processCompleted = true;
        res.status(500).json({
          success: false,
          connected: false,
          message: "Failed to check device",
          error: error.message,
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      message: "Device check error",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
   📝 Pre-enrollment: Capture fingerprint BEFORE creating employee
   Returns template that frontend stores temporarily
------------------------------------------------------ */
router.post("/pre-enroll", async (req, res) => {
  try {
    console.log(`🖐️ Starting pre-enrollment fingerprint capture`);

    // Spawn Python script to capture fingerprint
    const pythonScript = path.resolve(
      process.cwd(),
      "..",
      "Biometric_connect",
      "integrated_capture.py"
    );

    console.log(`📄 Python script: ${pythonScript}`);
    console.log("🐍 Using Python:", PYTHON_PATH);

    // Always use shell:false - Node.js spawn handles spaces in executable paths correctly
    const captureProcess = spawn(
      PYTHON_PATH,
      [pythonScript, "--capture", "temp", "Pre", "Enrollment"],
      {
        stdio: "pipe",
        timeout: 90000, // 90 seconds total (30 sec per scan x 3)
        shell: false, // shell:false avoids quoting issues; Node handles spaces in paths
        env: {
          ...process.env,
          MONGODB_URI:
            process.env.MONGODB_URI || "mongodb://localhost:27017/employee_db",
        },
      }
    );

    let stdout = "";
    let stderr = "";

    captureProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    captureProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    captureProcess.on("close", async (code) => {
      try {
        console.log(`Pre-enrollment process exited with code: ${code}`);
        console.log("Full stdout:", stdout);
        console.log("stderr:", stderr);
        
        if (code === 0) {
          // Parse result from Python script - find the JSON line
          const lines = stdout.trim().split('\n');
          let result = null;
          
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{')) {
              try {
                result = JSON.parse(line);
                console.log("✅ Found valid JSON at line", i);
                break;
              } catch (e) {
                console.log("⚠️ Line", i, "failed to parse");
              }
            }
          }
          
          if (!result) {
            throw new Error("No valid JSON found in Python output");
          }

          if (result.success && result.template) {
            console.log(`✅ Fingerprint captured successfully for pre-enrollment`);

            res.json({
              success: true,
              message: "Fingerprint captured successfully",
              template: result.template,
              templateLength: result.template_length,
            });
          } else {
            res.status(400).json({
              success: false,
              message: result.message || "Failed to capture fingerprint",
            });
          }
        } else {
          res.status(500).json({
            success: false,
            message: "Fingerprint capture failed",
            error: stderr,
          });
        }
      } catch (error) {
        console.error("Error processing pre-enrollment:", error);
        res.status(500).json({
          success: false,
          message: "Error processing fingerprint",
          error: error.message,
        });
      }
    });

    captureProcess.on("error", (error) => {
      console.error("Error spawning Python process:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start fingerprint capture",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Error in pre-enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Pre-enrollment error",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
   📝 Enroll fingerprint for employee (max 3)
------------------------------------------------------ */
router.post("/enroll/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { finger } = req.body; // Optional: specify which finger

    console.log(`🖐️ Starting fingerprint enrollment for employee: ${employeeId}`);

    // Find employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check if employee already has 3 fingerprints
    if (employee.fingerprintTemplates && employee.fingerprintTemplates.length >= 3) {
      return res.status(400).json({
        success: false,
        message: "Maximum 3 fingerprints already enrolled. Please delete one to add new.",
      });
    }

    // Spawn Python script to capture fingerprint
    const pythonScript = path.resolve(
      process.cwd(),
      "..",
      "Biometric_connect",
      "integrated_capture.py"
    );

    console.log(`🖐️ Enrolling fingerprint for employee ${employeeId}`);
    console.log(`📄 Python script: ${pythonScript}`);
    console.log("🐍 Using Python:", PYTHON_PATH);

    // Always use shell:false - Node.js spawn handles spaces in executable paths correctly
    const captureProcess = spawn(
      PYTHON_PATH,
      [
        pythonScript,
        "--capture",
        employeeId,
        employee.firstName,
        employee.lastName,
      ],
      {
        stdio: "pipe",
        timeout: 30000,
        shell: false, // shell:false avoids quoting issues; Node handles spaces in paths
        env: {
          ...process.env,
          MONGODB_URI:
            process.env.MONGODB_URI || "mongodb://localhost:27017/employee_db",
        },
      }
    );

    let stdout = "";
    let stderr = "";

    captureProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    captureProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    captureProcess.on("close", async (code) => {
      try {
        console.log(`Capture process exited with code: ${code}`);
        console.log("Full stdout:", stdout);
        console.log("stderr:", stderr);
        
        if (code === 0) {
          // Parse result from Python script - find the JSON line
          // SDK may print before and after our JSON, so we need to find it
          const lines = stdout.trim().split('\n');
          let result = null;
          
          // Try to find a line that's valid JSON starting with {
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{')) {
              try {
                result = JSON.parse(line);
                console.log("✅ Found valid JSON at line", i, ":", line);
                break;
              } catch (e) {
                console.log("⚠️ Line", i, "looks like JSON but failed to parse:", line.substring(0, 50));
              }
            }
          }
          
          if (!result) {
            throw new Error("No valid JSON found in Python output");
          }

          if (result.success && result.template) {
            // Add fingerprint template to employee
            if (!employee.fingerprintTemplates) {
              employee.fingerprintTemplates = [];
            }

            employee.fingerprintTemplates.push({
              template: result.template,
              enrolledAt: new Date(),
              finger: finger || "unknown",
            });

            // Update enrollment status
            employee.fingerprintEnrolled = true;
            employee.biometricStatus = "enrolled";

            // For backward compatibility, store first template in legacy field
            if (!employee.fingerprintTemplate) {
              employee.fingerprintTemplate = result.template;
            }

            await employee.save();

            console.log(
              `✅ Fingerprint enrolled successfully for ${employee.firstName} ${employee.lastName}`
            );

            res.json({
              success: true,
              message: "Fingerprint enrolled successfully",
              fingerprintCount: employee.fingerprintTemplates.length,
              employee: {
                _id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                fingerprintEnrolled: employee.fingerprintEnrolled,
                fingerprintCount: employee.fingerprintTemplates.length,
              },
            });
          } else {
            res.status(400).json({
              success: false,
              message: result.message || "Failed to capture fingerprint",
            });
          }
        } else {
          res.status(500).json({
            success: false,
            message: "Fingerprint capture failed",
            error: stderr,
          });
        }
      } catch (error) {
        console.error("Error processing fingerprint capture:", error);
        res.status(500).json({
          success: false,
          message: "Error processing fingerprint",
          error: error.message,
        });
      }
    });

    captureProcess.on("error", (error) => {
      console.error("Error spawning Python process:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start fingerprint capture",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Error in fingerprint enrollment:", error);
    res.status(500).json({
      success: false,
      message: "Enrollment error",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
   🗑️ Delete specific fingerprint template
------------------------------------------------------ */
router.delete("/fingerprint/:employeeId/:index", async (req, res) => {
  try {
    const { employeeId, index } = req.params;
    const fingerprintIndex = parseInt(index);

    console.log(
      `🗑️ Deleting fingerprint ${fingerprintIndex} for employee: ${employeeId}`
    );

    // Find employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Validate index
    if (
      !employee.fingerprintTemplates ||
      fingerprintIndex < 0 ||
      fingerprintIndex >= employee.fingerprintTemplates.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fingerprint index",
      });
    }

    // Remove fingerprint at index
    employee.fingerprintTemplates.splice(fingerprintIndex, 1);

    // Update enrollment status
    if (employee.fingerprintTemplates.length === 0) {
      employee.fingerprintEnrolled = false;
      employee.biometricStatus = "not enrolled";
      employee.fingerprintTemplate = null;
    } else {
      // Update legacy field with first template
      employee.fingerprintTemplate = employee.fingerprintTemplates[0].template;
    }

    await employee.save();

    console.log(
      `✅ Fingerprint deleted for ${employee.firstName} ${employee.lastName}`
    );

    res.json({
      success: true,
      message: "Fingerprint deleted successfully",
      fingerprintCount: employee.fingerprintTemplates.length,
    });
  } catch (error) {
    console.error("Error deleting fingerprint:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting fingerprint",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
   👤 Get employee fingerprints
------------------------------------------------------ */
router.get("/fingerprints/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId).select(
      "firstName lastName fingerprintTemplates fingerprintEnrolled"
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      fingerprints: employee.fingerprintTemplates || [],
      fingerprintCount: employee.fingerprintTemplates
        ? employee.fingerprintTemplates.length
        : 0,
      canAddMore:
        !employee.fingerprintTemplates ||
        employee.fingerprintTemplates.length < 3,
    });
  } catch (error) {
    console.error("Error fetching fingerprints:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching fingerprints",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
   ⏰ Record attendance via fingerprint (Time In/Out)
------------------------------------------------------ */
router.post("/attendance/record", async (req, res) => {
  try {
    console.log("📍 Starting fingerprint attendance recording...");

    const pythonScript = path.resolve(
      process.cwd(),
      "..",
      "Biometric_connect",
      "integrated_capture.py"
    );

    console.log("📍 Recording attendance with script:", pythonScript);
    console.log("🐍 Using Python:", PYTHON_PATH);

    // Always use shell:false - Node.js spawn handles spaces in executable paths correctly
    const attendanceProcess = spawn(PYTHON_PATH, [pythonScript, "--direct"], {
      stdio: "pipe",
      timeout: 30000,
      shell: false, // shell:false avoids quoting issues; Node handles spaces in paths
      env: {
        ...process.env,
        // Use the same MongoDB URI as the backend server
        MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/employee_db",
      },
    });

    let stdout = "";
    let stderr = "";

    attendanceProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    attendanceProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    attendanceProcess.on("close", (code) => {
      try {
        console.log(`Attendance process exited with code: ${code}`);
        console.log("Full stdout:", stdout);
        console.log("stderr:", stderr);
        
        // Parse result from Python script - find the JSON line
        const lines = stdout.trim().split('\n');
        let result = null;
        
        // Try to find a line that's valid JSON starting with {
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith('{')) {
            try {
              result = JSON.parse(line);
              console.log("✅ Found valid JSON at line", i, ":", line);
              break;
            } catch (e) {
              console.log("⚠️ Line", i, "looks like JSON but failed to parse");
            }
          }
        }
        
        if (!result) {
          // If no JSON found, this is a critical error
          return res.status(500).json({
            success: false,
            message: "Biometric device error",
            error: "No valid response from device",
            details: stdout || stderr,
          });
        }

        // Check result regardless of exit code (Python may exit with code 1 for expected failures)
        if (result.success) {
          console.log("✅ Attendance recorded successfully");
          
          // ✅ FIX ISSUE #1: Emit event for real-time dashboard updates
          // Broadcast attendance event to all connected clients via SSE or WebSocket
          if (global.eventEmitter) {
            global.eventEmitter.emit('attendance-recorded', {
              attendance: result.attendance,
              employee: result.employee,
              action: result.action
            });
          }
          
          res.json({
            success: true,
            message: result.message || "Attendance recorded successfully",
            attendance: result.attendance,
            employee: result.employee,
            action: result.action, // "time_in" or "time_out"
            timeIn: result.timeIn,
            timeOut: result.timeOut,
          });
        } else {
          // Expected failures (fingerprint not recognized, already completed, etc.)
          // Return 200 with success:false for business logic errors (not system errors)
          console.log("⚠️ Expected failure:", result.message);
          res.status(200).json({
            success: false,
            message: result.message || "Failed to record attendance",
          });
        }
      } catch (error) {
        console.error("Error parsing attendance result:", error);
        res.status(500).json({
          success: false,
          message: "Error processing attendance",
          error: error.message,
          details: stdout || stderr,
        });
      }
    });

    attendanceProcess.on("error", (error) => {
      console.error("Error spawning attendance process:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start attendance recording",
        error: error.message,
      });
    });
  } catch (error) {
    console.error("Error in attendance recording:", error);
    res.status(500).json({
      success: false,
      message: "Attendance error",
      error: error.message,
    });
  }
});

/* ------------------------------------------------------
   📊 Get today's attendance for employee
------------------------------------------------------ */
router.get("/attendance/today/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const Attendance = (await import("../models/AttendanceModels.js")).default;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today },
    }).populate("employee", "firstName lastName employeeId");

    res.json({
      success: true,
      attendance: attendance || null,
      hasTimeIn: !!attendance?.timeIn,
      hasTimeOut: !!attendance?.timeOut,
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance",
      error: error.message,
    });
  }
});

export default router;
