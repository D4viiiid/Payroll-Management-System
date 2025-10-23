# 🔐 Fingerprint Bridge Server

## Local Server for ZKTeco Fingerprint Scanner

**Purpose:** Connects your cloud-deployed web app (Vercel) to local USB fingerprint scanner

---

## 🚀 Quick Start (3 Steps!)

### Step 1: Install Dependencies

```powershell
cd employee/fingerprint-bridge
npm install
```

### Step 2: Connect Fingerprint Scanner

- Plug in your ZKTeco Live20R/SLK20R via USB
- Make sure device is powered on

### Step 3: Start Server

```powershell
npm start
```

You should see:

```
✅ Server running on: http://localhost:3001
🌐 CORS enabled for all origins (Vercel can access this server)
```

**That's it!** Now your web app can access the fingerprint scanner! 🎉

---

## ✅ How It Works

```
┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐
│   Web Browser   │          │  Bridge Server   │          │ ZKTeco Scanner  │
│  (Vercel App)   │◄────────►│  (localhost:3001)│◄────────►│  (USB Device)   │
└─────────────────┘   HTTP   └──────────────────┘  Python  └─────────────────┘
                                     Calls
```

1. **User clicks "Login with Fingerprint"** in web app (Vercel)
2. **Web app calls** `http://localhost:3001/api/fingerprint/login`
3. **Bridge server executes** Python script to access USB device
4. **Python script captures** fingerprint from ZKTeco scanner
5. **Result returns** to web app via JSON response
6. **User is logged in!** ✅

---

## 📋 API Endpoints

### Health Check

```http
GET http://localhost:3001/api/health
```

**Response:**

```json
{
  "success": true,
  "message": "✅ Fingerprint Bridge Server is running",
  "timestamp": "2025-10-23T10:00:00.000Z",
  "version": "1.0.0",
  "scriptsFound": true
}
```

### Capture Fingerprint

```http
POST http://localhost:3001/api/fingerprint/capture
```

**Response:**

```json
{
  "success": true,
  "fingerprintTemplate": "base64-encoded-template-data...",
  "message": "Fingerprint captured successfully"
}
```

### Login with Fingerprint

```http
POST http://localhost:3001/api/fingerprint/login
```

**Response:**

```json
{
  "success": true,
  "employee": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "email": "juan@example.com",
    "position": "Developer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### Enroll Fingerprint

```http
POST http://localhost:3001/api/fingerprint/enroll
Content-Type: application/json

{
  "employeeId": "507f1f77bcf86cd799439011",
  "firstName": "Maria",
  "lastName": "Santos",
  "email": "maria@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "fingerprintTemplate": "merged-template-from-3-scans...",
  "message": "Fingerprint enrolled successfully"
}
```

### Record Attendance

```http
POST http://localhost:3001/api/attendance/record
```

**Response:**

```json
{
  "success": true,
  "employee": {
    "firstName": "Pedro",
    "lastName": "Reyes"
  },
  "attendance": {
    "date": "2025-10-23",
    "timeIn": "2025-10-23T01:30:00.000Z",
    "status": "present"
  },
  "message": "Attendance recorded successfully"
}
```

---

## 🔧 Troubleshooting

### ❌ Error: "Python scripts not found"

**Problem:** Bridge can't find your Python scripts

**Solution:**

```powershell
# Make sure you're in the correct directory structure:
# employee/
#   fingerprint-bridge/
#     bridge.js  ← You are here
#   Biometric_connect/
#     capture_fingerprint_ipc_complete.py  ← Should be here
#     main.py  ← Should be here
```

### ❌ Error: "Device not found"

**Problem:** ZKTeco scanner not connected

**Solutions:**

1. Check USB cable is connected
2. Check device is powered on
3. Try different USB port
4. Reinstall ZKTeco drivers (Windows)
5. Test Python script directly:
   ```powershell
   cd ../Biometric_connect
   python test_device.py
   ```

### ❌ Error: "Python not found"

**Problem:** Python not installed or not in PATH

**Solution:**

1. Install Python 3.x from https://python.org
2. During installation, check "Add Python to PATH"
3. Restart terminal
4. Verify: `python --version`

### ❌ Error: "pyzkfp module not found"

**Problem:** Python library not installed

**Solution:**

```powershell
pip install pyzkfp
pip install pymongo
```

### ❌ Error: "CORS blocked"

**Problem:** Browser blocking requests to localhost:3001

**Solution:** This shouldn't happen as CORS is enabled for all origins in the bridge server. If it does:

1. Check bridge server is running
2. Check you're calling `http://localhost:3001` (not `https`)
3. Try different browser (Chrome/Edge recommended)

### ❌ Web app can't reach bridge server

**Problem:** Web app (Vercel) trying to call localhost:3001 but it's not reachable

**This is normal!** Localhost only works on the same machine. Solutions:

**Option A: Run web app locally**

```powershell
cd employee
npm run dev
```

Then access `http://localhost:5173` (both web app and bridge on same machine)

**Option B: Use ngrok to expose bridge to internet**

```powershell
# Install ngrok: https://ngrok.com/download
ngrok http 3001
```

Then update frontend to call the ngrok URL instead of localhost:3001

**Option C: Deploy bridge on client machines** (recommended for production)

- Give each employee with fingerprint scanner a copy of bridge server
- They run it on their local machine
- When they visit Vercel URL, frontend detects bridge running locally

---

## 📦 Deployment to Client Machines

### Package for Windows

Create a zip file with:

```
fingerprint-bridge/
├── bridge.js
├── package.json
├── node_modules/  (run npm install first)
├── README.md  (this file)
└── START_BRIDGE.bat  (created below)
```

Create `START_BRIDGE.bat`:

```batch
@echo off
echo Starting Fingerprint Bridge Server...
cd /d "%~dp0"
node bridge.js
pause
```

**Instructions for clients:**

1. Extract zip file
2. Double-click `START_BRIDGE.bat`
3. Visit web app URL (Vercel)
4. Fingerprint features work! ✅

### Package for macOS/Linux

Create `start-bridge.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")"
node bridge.js
```

Make it executable:

```bash
chmod +x start-bridge.sh
```

---

## 🎯 Integration with Frontend

### Update biometricService.js

```javascript
// employee/src/services/biometricService.js

const BRIDGE_URL = "http://localhost:3001/api/fingerprint";

// Check if bridge is running
export const checkBridgeHealth = async () => {
  try {
    const response = await fetch("http://localhost:3001/api/health");
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Bridge server not reachable:", error);
    return false;
  }
};

// Capture fingerprint
export const captureFingerprint = async () => {
  const response = await fetch(`${BRIDGE_URL}/capture`, { method: "POST" });
  return response.json();
};

// Login with fingerprint
export const loginWithFingerprint = async () => {
  const response = await fetch(`${BRIDGE_URL}/login`, { method: "POST" });
  return response.json();
};

// Enroll fingerprint
export const enrollFingerprint = async (employeeData) => {
  const response = await fetch(`${BRIDGE_URL}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employeeData),
  });
  return response.json();
};

// Record attendance
export const recordAttendance = async () => {
  const response = await fetch("http://localhost:3001/api/attendance/record", {
    method: "POST",
  });
  return response.json();
};
```

### Update Login Component

```jsx
// employee/src/components/Login.jsx

import {
  loginWithFingerprint,
  checkBridgeHealth,
} from "../services/biometricService";

const handleBiometricLogin = async () => {
  // Check if bridge is running
  const isRunning = await checkBridgeHealth();

  if (!isRunning) {
    alert(
      "❌ Fingerprint scanner not connected!\n\nPlease:\n1. Connect your fingerprint scanner via USB\n2. Run the Fingerprint Bridge Server\n3. Try again"
    );
    return;
  }

  try {
    setMessage("👆 Place finger on scanner...");

    const result = await loginWithFingerprint();

    if (result.success && result.employee) {
      // Store token
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.employee));

      // Redirect to dashboard
      navigate("/dashboard");
    } else {
      alert("❌ Fingerprint not recognized. Please try again.");
    }
  } catch (error) {
    console.error("Biometric login error:", error);
    alert("❌ Login failed: " + error.message);
  }
};
```

---

## ⚙️ Configuration

### Change Port

Edit `bridge.js` line 25:

```javascript
const PORT = 3001; // Change to any available port
```

Then update frontend to match:

```javascript
const BRIDGE_URL = "http://localhost:YOUR_PORT/api/fingerprint";
```

### Change Python Scripts Path

Edit `bridge.js` lines 27-29:

```javascript
const PYTHON_SCRIPT_DIR = path.join(__dirname, "../../Biometric_connect");
const CAPTURE_SCRIPT = path.join(PYTHON_SCRIPT_DIR, "your_script.py");
```

---

## 🔒 Security Considerations

### Development (Current Setup)

- ✅ CORS allows all origins (for easy development)
- ✅ Runs only on localhost (not accessible from internet)
- ✅ No authentication needed (local use only)

### Production Recommendations

- 🔐 Restrict CORS to specific Vercel domain
- 🔐 Add API key authentication
- 🔐 Use HTTPS with ngrok or similar
- 🔐 Log all fingerprint access attempts

**To restrict CORS in production:**

```javascript
// In bridge.js
app.use(
  cors({
    origin: "https://employee-frontend-eight-rust.vercel.app", // Your Vercel URL only
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

---

## 📊 Logs and Debugging

### Enable Verbose Logging

Bridge server already logs all operations:

- 🐍 Python script execution
- 📤 Script output
- ❌ Errors
- ✅ Success messages

View logs in terminal where bridge is running.

### Test Endpoints with cURL

```bash
# Health check
curl http://localhost:3001/api/health

# Capture fingerprint
curl -X POST http://localhost:3001/api/fingerprint/capture

# Login (wait for prompt to scan finger)
curl -X POST http://localhost:3001/api/fingerprint/login
```

### Test with Postman

1. Import these requests into Postman:

   - GET `http://localhost:3001/api/health`
   - POST `http://localhost:3001/api/fingerprint/login`
   - POST `http://localhost:3001/api/attendance/record`

2. When you send request, scanner will prompt for finger
3. Check response in Postman

---

## ✅ Success Checklist

- [ ] Node.js installed (`node --version` shows v14+)
- [ ] Python installed with pyzkfp library
- [ ] ZKTeco scanner connected via USB
- [ ] Bridge server dependencies installed (`npm install`)
- [ ] Bridge server starts without errors (`npm start`)
- [ ] Health check returns success (`curl http://localhost:3001/api/health`)
- [ ] Device detection works (check bridge logs show device found)
- [ ] Frontend updated to call bridge endpoints
- [ ] Test login with fingerprint works
- [ ] Test attendance recording works

---

## 🎉 Benefits of This Approach

✅ **Works with deployed system** - Vercel frontend + local bridge  
✅ **No backend changes needed** - Cloud backend stays on Vercel  
✅ **Reuses existing Python scripts** - No need to rewrite in JavaScript  
✅ **Easy to deploy** - Just copy folder to client machines  
✅ **All browsers supported** - No WebUSB limitations  
✅ **Simple to maintain** - Just Node.js + Python scripts  
✅ **Minimal installation** - Only Node.js needed on client machines

---

## 🆘 Support

**Need help?**

1. Check logs in bridge server terminal
2. Test Python scripts directly first
3. Verify USB device is detected by OS
4. Check firewall isn't blocking localhost:3001

**Common issues:**

- "Device not found" → Check USB connection
- "Python not found" → Add Python to PATH
- "Module not found" → Install pyzkfp with pip
- "CORS error" → Make sure bridge is running

---

**Ready to use! 🚀**

Start the bridge server, connect your scanner, and your fingerprint features will work with the deployed Vercel app!
