import express from "express";
import path from "path";

const router = express.Router();

/* ------------------------------------------------------
   🩺 Health check - actually test device connectivity
------------------------------------------------------ */
router.get("/health", async (req, res) => {
  try {
    const { spawn } = await import('child_process');
    const pythonScript = path.resolve(
      "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\Biometric_connect\\capture_fingerprint_ipc_complete.py"
    );

    // Quick test - try to run the script with health check flag
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
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: `❌ Health check failed: ${error.message}`,
      connected: false
    });
  }
});

/* ------------------------------------------------------
   🔐 Biometric login with direct database access (IPC)
------------------------------------------------------ */
router.post("/login", async (req, res) => {
  try {
    const { spawn } = await import('child_process');
    const pythonScript = path.resolve(
      "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\Biometric_connect\\capture_fingerprint_ipc_complete.py"
    );

    // Spawn Python script for direct database biometric login (IPC)
    const process = spawn("py", [pythonScript, "--login"], {
      stdio: "pipe",
      timeout: 30000, // 30 second timeout for IPC operations
      env: {
        ...process.env,
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db'
      }
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
            // IPC approach - Python directly authenticated employee from database
            res.json({
              success: true,
              message: result.message,
              employee: result.employee
            });
          } else {
            res.status(401).json({
              success: false,
              error: result.error || "Biometric login failed"
            });
          }
        } else {
          res.status(500).json({
            success: false,
            error: "Biometric login process failed",
            details: stderr
          });
        }
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: "Failed to parse biometric login response",
          details: stdout || stderr
        });
      }
    });

    process.on("error", (error) => {
      res.status(500).json({
        success: false,
        error: "Failed to start biometric login process",
        details: error.message
      });
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Biometric login failed",
      details: error.message
    });
  }
});

/* ------------------------------------------------------
   🔗 Connect to biometric device and record attendance directly (IPC)
------------------------------------------------------ */
router.post("/connect", async (req, res) => {
  try {
    const { spawn } = await import('child_process');
    const pythonScript = path.resolve(
      "C:\\Users\\Allan\\Downloads\\employee-20250919T204606Z-1-001\\employee\\Biometric_connect\\capture_fingerprint_ipc_complete.py"
    );

    // Spawn Python script for direct database attendance recording (IPC)
    const process = spawn("py", [pythonScript, "--direct"], {
      stdio: "pipe",
      timeout: 30000, // 30 second timeout for IPC operations
      env: {
        ...process.env,
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_db'
      }
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
            // IPC approach - Python directly recorded attendance in database
            res.json({
              success: true,
              message: result.message,
              employee: result.employee,
              attendance: result.attendance
            });
          } else {
            res.status(400).json({
              success: false,
              error: result.error || "Biometric attendance recording failed"
            });
          }
        } else {
          res.status(500).json({
            success: false,
            error: "Biometric attendance recording process failed",
            details: stderr
          });
        }
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: "Failed to parse biometric response",
          details: stdout || stderr
        });
      }
    });

    process.on("error", (error) => {
      res.status(500).json({
        success: false,
        error: "Failed to start biometric process",
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

export default router;
