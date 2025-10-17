// controllers/fingerprintController.js
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Enroll Endpoint
export const enrollFingerPrint = async (req, res) => {
  try {
    const { email, password, firstName, lastName, employeeId, position } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const scriptPath = path.join(__dirname, "../python/enroll.py");
    
    // Pass email and password as arguments to the Python script
    const child = spawn("python", [
      scriptPath, 
      email, 
      password,
      employeeId || "",
      firstName || "",
      lastName || "",
      position || ""
    ]);

    child.stdout.on("data", (data) => {
      console.log(`[ENROLL] ${data.toString()}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`[ENROLL ERROR] ${data.toString()}`);
    });

    child.on("close", (code) => {
      console.log(`[ENROLL] exited with code ${code}`);
    });

    res.json({ 
      message: "Enroll Python script started.",
      success: true,
      employeeId: employeeId,
      email: email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start enroll script." });
  }
};

// ✅ Verify Endpoint
export const verifyFingerPrint = async (req, res) => {
  try {
    const scriptPath = path.join(__dirname, "../python/verify.py");
    const child = spawn("python", [scriptPath]);

    child.stdout.on("data", (data) => {
      console.log(`[VERIFY] ${data.toString()}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`[VERIFY ERROR] ${data.toString()}`);
    });

    child.on("close", (code) => {
      console.log(`[VERIFY] exited with code ${code}`);
    });

    res.json({ message: "Verify Python script started." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to start verify script." });
  }
};
