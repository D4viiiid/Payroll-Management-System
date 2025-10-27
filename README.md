# 🏢 Employee Attendance & Payroll Management System

**Version:** 2.0.0  
**Owner:** Allan (RaeDisenyo)  
**Technology Stack:** MERN + Python + ZKTeco Biometric Integration  
**Status:** ✅ Production-Ready | 🚀 Deployed on Vercel

---

## 📋 Table of Contents

1. [System Overview](#-system-overview)
2. [Architecture](#-architecture)
3. [Features](#-features)
4. [Technology Stack](#-technology-stack)
5. [Prerequisites](#-prerequisites)
6. [Installation Guide](#-installation-guide)
   - [Backend Installation](#backend-installation)
   - [Frontend Installation](#frontend-installation)
   - [**Fingerprint Bridge Installation (Critical)**](#fingerprint-bridge-installation-critical)
7. [Database Schema](#-database-schema)
8. [Environment Configuration](#-environment-configuration)
9. [Deployment](#-deployment)
10. [API Documentation](#-api-documentation)
11. [Biometric Integration](#-biometric-integration)
12. [Troubleshooting](#-troubleshooting)
13. [Contributing](#-contributing)
14. [License](#-license)

---

## 🎯 System Overview

A comprehensive cloud-based employee management system with biometric authentication, real-time attendance tracking, automated payroll processing, and advanced reporting capabilities.

### Key Capabilities

- 👤 **Employee Management** - Full CRUD operations with profile pictures, roles, and salary rates
- 🔐 **Dual Authentication** - Username/password OR fingerprint biometric login
- ⏰ **Real-time Attendance** - ZKTeco Live20R/SLK20R fingerprint scanner integration
- 💰 **Automated Payroll** - Weekly payroll with overtime, deductions, and cash advances
- 📊 **Advanced Analytics** - Dashboard with charts, reports, and data export
- 📧 **Email Notifications** - Automated payroll notifications via Nodemailer
- 🔄 **Auto-backup** - Scheduled database archiving

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLOUD DEPLOYMENT (Vercel)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────┐         ┌──────────────────────────┐        │
│  │   Frontend (React)     │◄───────►│   Backend (Node.js)      │        │
│  │   Port: 5173 (dev)     │  HTTPS  │   Port: 5000 (dev)       │        │
│  │   Vite + React Router  │         │   Express + JWT Auth     │        │
│  │   TailwindCSS + Charts │         │   MongoDB + Mongoose     │        │
│  └────────────────────────┘         └──────────────────────────┘        │
│           │                                     │                        │
│           │                                     ▼                        │
│           │                          ┌──────────────────────────┐       │
│           │                          │  MongoDB Atlas (Cloud)   │       │
│           │                          │  Database: employee_db   │       │
│           │                          │  Collections: 8          │       │
│           │                          └──────────────────────────┘       │
└───────────┼─────────────────────────────────────────────────────────────┘
            │
            │ HTTPS (localhost:3003)
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LOCAL CLIENT MACHINE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────┐         ┌──────────────────────────┐        │
│  │  Fingerprint Bridge    │◄───────►│   ZKTeco Scanner USB     │        │
│  │  HTTPS Server          │  Python │   Live20R / SLK20R       │        │
│  │  Port: 3003            │  pyzkfp │   Fingerprint Device     │        │
│  │  Node.js + Express     │         │                          │        │
│  └────────────────────────┘         └──────────────────────────┘        │
│           │                                                              │
│           │ Python Scripts                                               │
│           ▼                                                              │
│  ┌────────────────────────────────────────────────┐                     │
│  │  Biometric_connect/                            │                     │
│  │  - capture_fingerprint_ipc_complete.py         │                     │
│  │  - enroll_fingerprint_cli.py                   │                     │
│  │  - main.py (GUI enrollment)                    │                     │
│  └────────────────────────────────────────────────┘                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

### Three-Tier Architecture

1. **Presentation Layer (Frontend)**

   - React 18.2 with Vite bundler
   - React Router for SPA navigation
   - TailwindCSS + Bootstrap for styling
   - Recharts for data visualization
   - React Toastify for notifications

2. **Business Logic Layer (Backend)**

   - Express.js REST API
   - JWT authentication & authorization
   - Mongoose ODM for MongoDB
   - Node-cron for scheduled jobs
   - Nodemailer for email integration

3. **Data Layer**
   - MongoDB Atlas (Cloud Database)
   - 8 Collections (employees, attendances, payrolls, etc.)
   - Indexed queries for performance
   - Automated backups

### Biometric Integration Layer

- **Local Bridge Server** (Node.js + HTTPS)
- **Python Scripts** (pyzkfp library)
- **ZKTeco SDK** (Windows)
- **USB Communication** (Direct device access)

---

## ✨ Features

### 👤 Employee Management

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Auto-generated Employee IDs (EMP-XXXX format)
- ✅ Profile picture upload (Base64 encoded)
- ✅ Multiple employee statuses (Regular, On-Call, Probationary)
- ✅ Position and department assignment
- ✅ Salary rate configuration (daily, hourly, overtime)
- ✅ Contact information management
- ✅ Hire date tracking with validation

### 🔐 Authentication & Authorization

- ✅ **Dual Login System:**
  - Username/Password (bcrypt hashed)
  - Fingerprint biometric (ZKTeco scanner)
- ✅ JWT token-based authentication (90-day expiry)
- ✅ Admin panel access with 6-digit PIN
- ✅ Role-based access control (Admin vs Regular)
- ✅ Automatic password generation for new employees
- ✅ Account activation workflow

### ⏰ Attendance Tracking

- ✅ **Time-In/Time-Out** recording
- ✅ **Biometric Fingerprint** verification
- ✅ Real-time attendance dashboard
- ✅ Manual attendance entry (Admin only)
- ✅ Attendance modification history
- ✅ Auto-close shifts at midnight
- ✅ Late/Undertime calculation
- ✅ Overtime hours tracking
- ✅ Daily/Weekly/Monthly attendance reports
- ✅ Export to CSV/PDF

### 💰 Payroll Management

- ✅ **Automated Weekly Payroll** (Scheduled every Sunday)
- ✅ Overtime pay calculation (1.25x hourly rate)
- ✅ No-pay threshold (< 4 hours worked)
- ✅ Cash advance deductions
- ✅ Mandatory deductions (SSS, PhilHealth, Pag-IBIG, Tax)
- ✅ Custom deductions support
- ✅ Payroll history and audit trail
- ✅ Email payslips to employees
- ✅ Bulk payroll generation
- ✅ Payroll reports with filters

### 📊 Dashboard & Analytics

- ✅ Real-time employee statistics
- ✅ Attendance trends (Line charts)
- ✅ Department distribution (Pie charts)
- ✅ Top performers tracking
- ✅ Attendance rate calculation
- ✅ Payroll summaries
- ✅ Quick action buttons
- ✅ Recent activities feed

### 🔄 Automated Jobs (Cron)

- ✅ **Weekly Payroll** - Every Sunday at 11:59 PM
- ✅ **Auto-close Shifts** - Every day at 11:59 PM
- ✅ **Daily Attendance Summary** - Every day at 11:59 PM
- ✅ **Database Backup** - Every Sunday at 2:00 AM
- ✅ **Cash Advance Reminders** - Every Monday at 9:00 AM

### 📧 Email Notifications

- ✅ Payslip delivery (Gmail SMTP)
- ✅ Cash advance reminders
- ✅ Account activation emails
- ✅ Password reset emails (planned)

---

## 🛠️ Technology Stack

### Frontend

- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.8
- **Routing:** React Router DOM 6.30.0
- **Styling:** TailwindCSS 3.4.0 + Bootstrap 5.3.0
- **Charts:** Recharts 2.15.3 + Chart.js
- **HTTP Client:** Axios 1.9.0
- **Notifications:** React Toastify 11.0.5
- **Icons:** React Icons 4.10.1
- **State Management:** React Context API + Hooks

### Backend

- **Runtime:** Node.js 18+
- **Framework:** Express 5.1.0
- **Database:** MongoDB 6.16.0 + Mongoose 8.14.3
- **Authentication:** JWT (jsonwebtoken 9.0.0) + bcryptjs 2.4.3
- **Security:** Helmet 7.0.0 + express-rate-limit 6.7.0
- **Validation:** express-validator 7.0.1
- **Compression:** compression 1.8.1
- **Caching:** node-cache 5.1.2
- **Cron Jobs:** node-cron 4.2.1
- **Email:** Nodemailer 7.0.9
- **PDF Generation:** PDFKit 0.17.2
- **Logging:** Morgan 1.10.0

### Biometric Integration

- **Local Server:** Node.js + Express (HTTPS)
- **SDK:** ZKFinger SDK 5.3.0.33 (Windows)
- **Python Library:** pyzkfp (ZKFP2)
- **Device:** ZKTeco Live20R / SLK20R Fingerprint Scanner
- **Communication:** USB → Python → Node.js → React

### Database (MongoDB Atlas)

- **Database Name:** `employee_db`
- **Collections:**
  1. `employees` - Employee records with fingerprints
  2. `attendances` - Daily attendance logs
  3. `payrolls` - Processed payroll data
  4. `salaries` - Salary configuration
  5. `deductions` - Deduction records
  6. `cashadvances` - Cash advance loans
  7. `schedules` - Employee schedules
  8. `archives` - Archived data

### Deployment

- **Frontend:** Vercel (https://employee-frontend-eight-rust.vercel.app)
- **Backend:** Vercel Serverless Functions (https://payroll-backend-cyan.vercel.app)
- **Database:** MongoDB Atlas (Cloud)
- **Bridge Server:** Local installation on client machines

---

## 📦 Prerequisites

### Required Software

1. **Node.js** (v18 or later)

   - Download: https://nodejs.org
   - Verify: `node --version`

2. **Python** (v3.7 or later)

   - Download: https://python.org
   - **IMPORTANT:** Check "Add Python to PATH" during installation
   - Verify: `python --version`

3. **Git** (for cloning repository)

   - Download: https://git-scm.com
   - Verify: `git --version`

4. **MongoDB Account** (Free tier available)

   - Sign up: https://mongodb.com/atlas
   - Create cluster and get connection string

5. **ZKTeco Fingerprint Scanner** (For biometric features)
   - Device: Live20R or SLK20R
   - Connection: USB
   - OS: Windows 7 or later

### Python Dependencies

```bash
pip install pyzkfp pymongo python-dotenv
```

### System Requirements

- **OS:** Windows 10/11 (for fingerprint scanner)
- **RAM:** 4 GB minimum, 8 GB recommended
- **Storage:** 500 MB for application files
- **Network:** Internet connection for cloud database
- **USB Port:** For ZKTeco fingerprint scanner

---

## 📥 Installation Guide

### Quick Start (Development Mode)

```powershell
# Clone repository
git clone https://github.com/D4viiiid/Payroll-Management-System.git
cd Attendance-and-Payroll-Management-System

# Install backend dependencies
cd employee/payroll-backend
npm install

# Install frontend dependencies
cd ../
npm install

# Install fingerprint bridge dependencies
cd fingerprint-bridge
npm install
```

---

### Backend Installation

#### Step 1: Install Dependencies

```powershell
cd employee/payroll-backend
npm install
```

#### Step 2: Configure Environment Variables

Create `config.env` in `employee/payroll-backend/`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=90d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# API Base URL
API_BASE_URL=http://localhost:5000

# Auto Payroll (set to false to disable)
ENABLE_AUTO_PAYROLL=true
```

**⚠️ IMPORTANT:** Replace placeholder values with your actual credentials!

#### Step 3: Test Database Connection

```powershell
node test-db.js
```

Expected output:

```
✅ MongoDB Connected Successfully!
📊 Database: employee_db
📁 Collections: 8
```

#### Step 4: Start Backend Server

```powershell
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

Expected output:

```
🚀 Server running on http://localhost:5000
📗 Serverless MongoDB connection ready
```

---

### Frontend Installation

#### Step 1: Install Dependencies

```powershell
cd employee
npm install
```

#### Step 2: Configure Environment Variables

Create `.env` in `employee/`:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# App Environment
VITE_APP_ENV=development
VITE_APP_NAME=Payroll Management System
```

#### Step 3: Start Frontend Development Server

```powershell
npm run dev
```

Expected output:

```
  VITE v5.4.19  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### Step 4: Access Application

Open browser and navigate to: **http://localhost:5173**

**Default Admin Credentials:**

- Username: `ADMIN`
- Password: `ADMIN123`
- Admin PIN: `111111`

---

### Fingerprint Bridge Installation (CRITICAL)

> **⚠️ REQUIRED FOR BIOMETRIC FEATURES**  
> This local bridge server connects the cloud-deployed web app to the USB fingerprint scanner on your local machine.

#### Why You Need This

The web app is deployed on Vercel (cloud), but the ZKTeco fingerprint scanner is a USB device on your local computer. The bridge server acts as a middleman:

```
Cloud Web App (Vercel) ←→ Bridge Server (localhost:3003) ←→ USB Scanner
```

---

#### 📥 Method 1: Automated Installer (Recommended)

**Step 1: Download Installer Package**

1. Visit deployed web app: https://employee-frontend-eight-rust.vercel.app
2. Navigate to **Downloads** section
3. Click **"Download Fingerprint Bridge Installer"**
4. Save `fingerprint-bridge-installer.zip` (13.18 MB)

**Step 2: Extract ZIP File**

Extract to a permanent location (e.g., `C:\fingerprint-bridge`)

**Contents:**

```
fingerprint-bridge/
├── bridge.js                              # Main server file
├── package.json                           # Dependencies
├── install-service.js                     # Windows Service installer
├── uninstall-service.js                   # Windows Service uninstaller
├── generate-certificate.js                # SSL certificate generator
├── INSTALL_AUTO_SERVICE.bat               # ⭐ One-click installer
├── UNINSTALL_SERVICE.bat                  # Service uninstaller
├── START_BRIDGE.bat                       # Manual start script
├── README.md                              # Documentation
├── Biometric_connect/                     # Python scripts
│   ├── capture_fingerprint_ipc_complete.py
│   ├── enroll_fingerprint_cli.py
│   ├── main.py
│   └── __init__.py
├── zkfinger-sdk/                          # ⭐ NEW: Auto-installed SDK
│   ├── setup.exe                          # ZKFinger SDK installer
│   ├── CHECK_SDK_INSTALLATION.ps1         # SDK detection script
│   └── INSTALL_ZKFINGER_SDK.bat          # SDK auto-installer
├── requirements.txt                       # Python dependencies
└── config.env.example                     # MongoDB config template
```

**Step 3: Run Automated Installer**

1. **Right-click** `INSTALL_AUTO_SERVICE.bat`
2. Select **"Run as Administrator"**

**What This Does:**

```
[1/6] Checking Node.js installation...
      ✅ Node.js v20.11.0 found

[1.5/6] Checking ZKFinger SDK installation...          ⭐ NEW!
      ⚠️  ZKFinger SDK is NOT installed!
      🔧 Installing ZKFinger SDK automatically...
      ✅ ZKFinger SDK installed successfully!

[2/6] Checking Python installation...
      ✅ Python 3.11.5 found

[3/6] Installing Python dependencies...
      ✅ pyzkfp installed
      ✅ pymongo installed

[4/6] Installing Node.js dependencies...
      ✅ express, cors, dotenv installed

[5/6] Generating SSL certificate...
      ✅ cert.pem and key.pem created

[6/6] Installing Windows Service...
      ✅ Service "FingerprintBridgeService" installed
      ✅ Service started automatically
```

**Step 4: Verify Installation**

Open browser and visit: **https://localhost:3003/api/health**

Expected response:

```json
{
  "success": true,
  "message": "✅ Fingerprint Bridge Server is running",
  "deviceConnected": true,
  "deviceStatus": "connected",
  "version": "2.0.1",
  "scriptsFound": true,
  "usbMonitoring": true,
  "pythonPath": "C:\\Python313\\python.exe",
  "mongodbUri": "✅ Configured"
}
```

**🎉 Installation Complete!**

The bridge server is now:

- ✅ Installed as Windows Service
- ✅ Auto-starts on system boot
- ✅ Running on HTTPS (port 3003)
- ✅ Connected to ZKTeco scanner
- ✅ Ready for web app requests

---

#### 📥 Method 2: Manual Installation (Advanced Users)

**Step 1: Navigate to Bridge Directory**

```powershell
cd employee/fingerprint-bridge
```

**Step 2: Install Node.js Dependencies**

```powershell
npm install
```

**Step 3: Install Python Dependencies**

```powershell
pip install pyzkfp pymongo python-dotenv
```

**Step 4: Configure MongoDB Connection**

Create `config.env` in `employee/fingerprint-bridge/`:

```env
MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0
BRIDGE_PORT=3003
```

**Step 5: Generate SSL Certificate**

```powershell
node generate-certificate.js
```

Output:

```
✅ SSL Certificate generated successfully!
   cert.pem - SSL Certificate
   key.pem - Private Key
```

**Step 6: Start Bridge Server**

```powershell
npm start
```

Expected output:

```
🔐 FINGERPRINT BRIDGE SERVER v2.0 (HTTPS MODE)
✅ Server running on: https://localhost:3003
🔒 SSL Certificate: cert.pem
🔑 SSL Private Key: key.pem
📁 Python scripts directory: C:\...\Biometric_connect
🐍 Capture script: capture_fingerprint_ipc_complete.py
🐍 Enrollment script: enroll_fingerprint_cli.py
💾 MongoDB URI: ✅ Configured

📋 Available endpoints:
   GET  /api/health                 - Health check + device status
   GET  /api/device/status          - Detailed device status
   POST /api/fingerprint/capture    - Capture fingerprint
   POST /api/fingerprint/login      - Login with fingerprint
   POST /api/fingerprint/enroll     - Enroll new fingerprint
   POST /api/fingerprint/verify     - Verify fingerprint
   POST /api/attendance/record      - Record attendance

⚠️  FIRST TIME SETUP:
   When accessing https://localhost:3003 from browser:
   1. Browser shows "Not Secure" warning (self-signed cert)
   2. Click "Advanced" → "Proceed to localhost (unsafe)"
   3. This is SAFE - it's your own computer!
   4. Browser remembers - no warning on future visits

🔌 USB Monitoring: ✅ Active
```

**Step 7: Test Health Endpoint**

Open browser: **https://localhost:3003/api/health**

Accept the SSL certificate warning (first time only).

---

#### 🔧 Troubleshooting Bridge Installation

**Problem: "ZKFinger SDK not found"**

**Solution:**

```powershell
# Manual SDK installation
cd zkfinger-sdk
.\setup.exe /S
```

**Problem: "Python not found"**

**Solution:**

1. Install Python from https://python.org
2. Check "Add Python to PATH"
3. Restart PowerShell
4. Verify: `python --version`

**Problem: "pyzkfp module not found"**

**Solution:**

```powershell
pip install pyzkfp
```

**Problem: "Device not connected"**

**Solutions:**

1. Plug in ZKTeco scanner via USB
2. Install ZKFinger SDK (now auto-installed!)
3. Check Windows Device Manager
4. Try different USB port
5. Test: `python Biometric_connect/test_device.py`

**Problem: "Certificate warning won't go away"**

**Solution:**

1. Click "Advanced" on warning page
2. Click "Proceed to localhost (unsafe)"
3. This is safe - it's your own computer
4. Warning disappears after first acceptance

**Problem: "Service won't start"**

**Solution:**

```powershell
# Check service status
sc query FingerprintBridgeService

# Start manually
sc start FingerprintBridgeService

# Check logs
Get-EventLog -LogName Application -Source "FingerprintBridgeService" -Newest 10
```

---

#### 🎯 Using the Bridge with Deployed Web App

Once installed, the bridge works automatically with the Vercel-deployed web app!

**How It Works:**

1. **Visit deployed web app:** https://employee-frontend-eight-rust.vercel.app
2. **Bridge runs locally:** https://localhost:3003 (auto-starts with Windows)
3. **Click "Login with Fingerprint"** or **"Record Attendance"**
4. **Web app calls:** `https://localhost:3003/api/fingerprint/login`
5. **Bridge server executes:** Python script → USB scanner
6. **Scanner prompts:** "Place finger on sensor"
7. **User scans finger** → Bridge captures → Verifies against DB
8. **Response returns:** User logged in! ✅

**No manual intervention needed!** The bridge runs as a Windows Service and starts automatically on boot.

---

## 📊 Database Schema

### MongoDB Collections

#### 1. `employees` Collection

```javascript
{
  _id: ObjectId,
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  contactNumber: String (required),
  employeeId: String (auto-generated: "EMP-XXXX"),
  status: String (enum: "regular", "oncall", "probationary"),
  position: String,
  department: String,
  hireDate: Date (required),
  salary: Number (default: 0),

  // Authentication
  username: String (unique, sparse),
  password: String (bcrypt hashed),
  isActive: Boolean (default: false),
  isAdmin: Boolean (default: false),
  adminPin: String (bcrypt hashed, 6 digits),

  // Salary Configuration
  employmentType: String (enum: "regular", "oncall"),
  dailyRate: Number (default: 550),
  hourlyRate: Number (default: 68.75),
  overtimeRate: Number (default: 85.94),

  // Biometric
  fingerprintTemplate: String (base64 encoded),
  fingerprintEnrolled: Boolean (default: false),

  // Profile
  profilePicture: String (base64 data URL),

  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. `attendances` Collection

```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref: "Employee"),
  employeeId: String,
  date: Date (format: YYYY-MM-DD),
  timeIn: Date (ISO timestamp),
  timeOut: Date (ISO timestamp, nullable),
  status: String (enum: "present", "absent", "late", "on_leave", "no_pay"),
  hoursWorked: Number,
  overtimeHours: Number (default: 0),
  lateMinutes: Number (default: 0),
  undertimeMinutes: Number (default: 0),
  remarks: String,
  isManualEntry: Boolean (default: false),
  modifiedBy: ObjectId (ref: "Employee", nullable),
  modificationHistory: [{
    modifiedBy: ObjectId,
    modifiedAt: Date,
    previousTimeIn: Date,
    previousTimeOut: Date,
    reason: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. `payrolls` Collection

```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref: "Employee"),
  employeeId: String,
  payPeriod: {
    startDate: Date,
    endDate: Date,
    weekNumber: Number
  },
  basicPay: Number,
  overtimePay: Number,
  totalDeductions: Number,
  netPay: Number,
  breakdown: {
    regularDays: Number,
    regularPay: Number,
    overtimeHours: Number,
    overtimePay: Number,
    cashAdvanceDeduction: Number,
    mandatoryDeductions: {
      sss: Number,
      philhealth: Number,
      pagibig: Number,
      tax: Number
    },
    customDeductions: [{
      type: String,
      amount: Number,
      description: String
    }]
  },
  status: String (enum: "pending", "approved", "paid", "cancelled"),
  generatedBy: ObjectId (ref: "Employee"),
  generatedAt: Date,
  approvedBy: ObjectId (ref: "Employee", nullable),
  approvedAt: Date (nullable),
  emailSent: Boolean (default: false),
  emailSentAt: Date (nullable),
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. `salaries` Collection

```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref: "Employee", required),
  dailyRate: Number (required, default: 550),
  hourlyRate: Number (calculated: dailyRate / 8),
  overtimeRate: Number (calculated: hourlyRate * 1.25),
  effectiveDate: Date (default: now),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

#### 5. `deductions` Collection

```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref: "Employee", required),
  type: String (enum: "cash_advance", "loan", "custom"),
  amount: Number (required),
  description: String,
  deductionDate: Date (default: now),
  status: String (enum: "pending", "deducted", "cancelled"),
  deductedInPayroll: ObjectId (ref: "Payroll", nullable),
  createdBy: ObjectId (ref: "Employee"),
  createdAt: Date,
  updatedAt: Date
}
```

#### 6. `cashadvances` Collection

```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref: "Employee", required),
  amount: Number (required, min: 1),
  reason: String,
  requestDate: Date (default: now),
  status: String (enum: "pending", "approved", "deducted", "cancelled"),
  approvedBy: ObjectId (ref: "Employee", nullable),
  approvedAt: Date (nullable),
  deductedInPayroll: ObjectId (ref: "Payroll", nullable),
  deductedAt: Date (nullable),
  dueDate: Date,
  reminderSent: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

#### 7. `schedules` Collection

```javascript
{
  _id: ObjectId,
  employee: ObjectId (ref: "Employee", required),
  dayOfWeek: String (enum: "Monday", "Tuesday", ...),
  shiftStart: String (format: "HH:MM"),
  shiftEnd: String (format: "HH:MM"),
  isWorkday: Boolean (default: true),
  breakDuration: Number (minutes, default: 60),
  createdAt: Date,
  updatedAt: Date
}
```

#### 8. `archives` Collection

```javascript
{
  _id: ObjectId,
  collectionName: String,
  documentId: ObjectId,
  originalDocument: Object,
  archiveReason: String,
  archivedBy: ObjectId (ref: "Employee"),
  archivedAt: Date,
  createdAt: Date
}
```

---

## ⚙️ Environment Configuration

### Production Environment Variables

#### Backend (Vercel)

**Environment Variables:**

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=RaeDisenyo2025_SuperSecure_JWT_Key_For_Production_PayrollSystem!@#$%%
JWT_EXPIRES_IN=90d
CORS_ORIGIN=https://employee-frontend-eight-rust.vercel.app
FRONTEND_URL=https://employee-frontend-eight-rust.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
ENABLE_AUTO_PAYROLL=true
```

#### Frontend (Vercel)

**Environment Variables:**

```env
VITE_API_URL=https://payroll-backend-cyan.vercel.app/api
VITE_APP_ENV=production
VITE_APP_NAME=Payroll Management System
```

#### Fingerprint Bridge (Local)

**Environment Variables (`config.env`):**

```env
MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0
BRIDGE_PORT=3003
```

---

## 🚀 Deployment

### Vercel Deployment (Automatic)

The system is configured for automatic deployment on Vercel:

**Frontend:** https://employee-frontend-eight-rust.vercel.app
**Backend:** https://payroll-backend-cyan.vercel.app

**Deployment Workflow:**

1. Push code to `main` branch on GitHub
2. Vercel auto-detects changes
3. Runs build scripts
4. Deploys to production (~2 minutes)

**Build Configuration:**

**Frontend (`employee/vercel.json`):**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**Backend (`employee/payroll-backend/vercel.json`):**

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

**Pre-deployment Checklist:**

- [ ] Environment variables set in Vercel dashboard
- [ ] MongoDB Atlas IP whitelist configured (0.0.0.0/0 for Vercel)
- [ ] JWT_SECRET is strong and unique
- [ ] Email credentials configured
- [ ] CORS_ORIGIN matches frontend URL
- [ ] Build completes locally without errors

---

## 📖 API Documentation

### Base URLs

- **Development:** `http://localhost:5000/api`
- **Production:** `https://payroll-backend-cyan.vercel.app/api`

### Authentication

All protected endpoints require JWT token in header:

```
Authorization: Bearer <token>
```

### Endpoints

#### Authentication

**POST /api/employees/login**

- Description: Login with username/password
- Body: `{ username, password }`
- Returns: `{ success, token, employee }`

**POST /api/biometric/login**

- Description: Login with fingerprint
- Triggers: Fingerprint scanner via bridge
- Returns: `{ success, token, employee }`

#### Employees

**GET /api/employees**

- Description: Get all employees
- Auth: Required
- Returns: Array of employee objects

**POST /api/employees**

- Description: Create new employee
- Auth: Admin only
- Body: `{ firstName, lastName, email, contactNumber, position, hireDate, status }`
- Returns: Created employee + triggers fingerprint enrollment

**PUT /api/employees/:id**

- Description: Update employee
- Auth: Admin only
- Body: Updated fields
- Returns: Updated employee

**DELETE /api/employees/:id**

- Description: Delete employee
- Auth: Admin only
- Returns: Success message

#### Attendance

**GET /api/attendance**

- Description: Get all attendance records
- Auth: Required
- Query params: `?date=YYYY-MM-DD&employeeId=XXX`
- Returns: Array of attendance records

**POST /api/attendance**

- Description: Record attendance manually
- Auth: Admin only
- Body: `{ employeeId, date, timeIn, timeOut, status }`
- Returns: Created attendance record

**POST /api/biometric/connect**

- Description: Record attendance via fingerprint
- Triggers: Fingerprint scanner via bridge
- Returns: `{ success, employee, attendance }`

**PUT /api/attendance/:id**

- Description: Update attendance
- Auth: Admin only
- Body: `{ timeIn, timeOut, remarks }`
- Returns: Updated attendance

#### Payroll

**GET /api/payrolls**

- Description: Get all payroll records
- Auth: Required
- Query params: `?startDate=XXX&endDate=XXX&employeeId=XXX`
- Returns: Array of payroll records

**POST /api/payrolls/generate**

- Description: Generate payroll for date range
- Auth: Admin only
- Body: `{ startDate, endDate, employeeIds }`
- Returns: Generated payroll records

**POST /api/admin/trigger-payroll**

- Description: Manually trigger weekly payroll job
- Auth: Admin only
- Returns: Payroll generation result

**GET /api/admin/payroll-status**

- Description: Check current week payroll status
- Auth: Admin only
- Returns: Payroll status + next run time

#### Salary Rate Management

**GET /api/salary-rate/history**

- Description: Get salary rate history for employee
- Auth: Public (no auth required)
- Query: `?employeeId=XXX`
- Returns: Array of salary rate records

**POST /api/salary-rate**

- Description: Create/Update salary rate
- Auth: Admin only
- Body: `{ employeeId, dailyRate, hourlyRate, overtimeRate }`
- Returns: Created salary rate

#### Deductions

**GET /api/deductions**

- Description: Get all deductions
- Auth: Required
- Returns: Array of deduction records

**POST /api/deductions**

- Description: Create deduction
- Auth: Admin only
- Body: `{ employeeId, type, amount, description }`
- Returns: Created deduction

#### Cash Advances

**GET /api/cash-advance**

- Description: Get all cash advances
- Auth: Required
- Returns: Array of cash advance records

**POST /api/cash-advance**

- Description: Request cash advance
- Auth: Required
- Body: `{ amount, reason }`
- Returns: Created cash advance

**PUT /api/cash-advance/:id/approve**

- Description: Approve cash advance
- Auth: Admin only
- Returns: Updated cash advance

#### Fingerprint Bridge Health

**GET https://localhost:3003/api/health**

- Description: Check bridge server status
- Auth: None
- Returns: `{ success, deviceConnected, version }`

**POST https://localhost:3003/api/fingerprint/enroll**

- Description: Enroll fingerprint for employee
- Auth: None (local only)
- Body: `{ employeeId, firstName, lastName, email }`
- Returns: `{ success, fingerprintTemplate }`

---

## 🔐 Biometric Integration

### How Fingerprint Login Works

#### 1. User Clicks "Login with Fingerprint"

```javascript
// Frontend: Login.jsx
const handleBiometricLogin = async () => {
  try {
    // Check if bridge is running
    const bridgeHealth = await fetch("https://localhost:3003/api/health");
    if (!bridgeHealth.ok) {
      alert("Fingerprint scanner not connected!");
      return;
    }

    setMessage("👆 Place finger on scanner...");

    // Call bridge server
    const response = await fetch(
      "https://localhost:3003/api/fingerprint/login",
      {
        method: "POST",
      }
    );

    const result = await response.json();

    if (result.success && result.employee) {
      // Store token
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.employee));

      // Redirect to dashboard
      navigate("/dashboard");
    } else {
      alert("❌ Fingerprint not recognized");
    }
  } catch (error) {
    alert("❌ Scanner error: " + error.message);
  }
};
```

#### 2. Bridge Server Receives Request

```javascript
// Bridge Server: bridge.js
app.post("/api/fingerprint/login", async (req, res) => {
  try {
    // Execute Python script with --login flag
    const result = await executePython(CAPTURE_SCRIPT, ["--login"]);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fingerprint login failed",
      error: error.message,
    });
  }
});
```

#### 3. Python Script Captures Fingerprint

```python
# Python: capture_fingerprint_ipc_complete.py
from pyzkfp import ZKFP2
import pymongo
import sys

# Initialize ZKTeco device
zkfp2 = ZKFP2()
zkfp2.Init()
zkfp2.OpenDevice(0)

# Capture fingerprint
tmp, img = zkfp2.AcquireFingerprint()

# Connect to MongoDB
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
db = client['employee_db']

# Search for matching fingerprint
employees = db.employees.find({'fingerprintEnrolled': True})

for emp in employees:
    stored_template = base64.b64decode(emp['fingerprintTemplate'])

    # Verify match
    ret = zkfp2.DBMatch(tmp[0], stored_template)

    if ret > 0:  # Match found!
        # Generate JWT token
        token = jwt.encode({
            'id': str(emp['_id']),
            'username': emp['username'],
            'isAdmin': emp.get('isAdmin', False)
        }, JWT_SECRET, algorithm='HS256')

        # Return employee data + token
        print(json.dumps({
            'success': True,
            'employee': {
                '_id': str(emp['_id']),
                'firstName': emp['firstName'],
                'lastName': emp['lastName'],
                'email': emp['email']
            },
            'token': token,
            'message': 'Login successful'
        }))
        sys.exit(0)

# No match found
print(json.dumps({
    'success': False,
    'message': 'Fingerprint not recognized'
}))
```

#### 4. Frontend Receives Response

User is logged in and redirected to dashboard! ✅

---

### Fingerprint Enrollment Flow

#### 1. Admin Creates New Employee

```javascript
// Frontend: Employee.jsx
const handleAddEmployee = async (employeeData) => {
  const response = await fetch("/api/employees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(employeeData),
  });

  const result = await response.json();

  if (result.success) {
    alert("✅ Employee created! Enrolling fingerprint...");
    // Enrollment happens automatically in backend
  }
};
```

#### 2. Backend Triggers Enrollment

```javascript
// Backend: Employee.js route
router.post("/", auth, adminAuth, async (req, res) => {
  // Create employee in database
  const employee = await Employee.create(req.body);

  // Trigger fingerprint enrollment via bridge
  const bridgeResponse = await fetch(
    "https://localhost:3003/api/fingerprint/enroll",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
      }),
    }
  );

  const enrollmentResult = await bridgeResponse.json();

  if (enrollmentResult.success) {
    // Update employee with fingerprint template
    employee.fingerprintTemplate = enrollmentResult.fingerprintTemplate;
    employee.fingerprintEnrolled = true;
    await employee.save();
  }

  res.json({ success: true, employee });
});
```

#### 3. Bridge Executes Enrollment Script

```python
# Python: enroll_fingerprint_cli.py
import sys
import json

employee_data = json.loads(sys.argv[2])

# Initialize device
zkfp2 = ZKFP2()
zkfp2.Init()
zkfp2.OpenDevice(0)

print(f"Enrolling fingerprint for: {employee_data['firstName']} {employee_data['lastName']}")

# Capture 3 fingerprints
templates = []
for i in range(3):
    print(f"\nScan #{i+1}/3 - Place finger on scanner...")
    tmp, img = zkfp2.AcquireFingerprint()
    templates.append(tmp[0])
    print("✅ Captured!")

# Merge templates
merged_template, merged_size = zkfp2.DBMerge(*templates)

# Encode to base64
template_b64 = base64.b64encode(merged_template).decode('utf-8')

# Return result
print(json.dumps({
    'success': True,
    'fingerprintTemplate': template_b64,
    'templateLength': merged_size,
    'message': 'Fingerprint enrolled successfully'
}))
```

#### 4. Employee Can Now Login with Fingerprint! 🎉

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue #1: "MongoDB Connection Failed"

**Symptoms:**

- Backend won't start
- Error: "MongoDB connection error"

**Solutions:**

1. **Check MongoDB URI:**

   ```powershell
   # In config.env, verify:
   MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db
   ```

2. **Verify MongoDB Atlas IP Whitelist:**

   - Go to MongoDB Atlas dashboard
   - Network Access → IP Whitelist
   - Add `0.0.0.0/0` (allow all IPs for Vercel)

3. **Test connection:**
   ```powershell
   cd employee/payroll-backend
   node test-db.js
   ```

---

#### Issue #2: "Fingerprint Scanner Not Detected"

**Symptoms:**

- Bridge health shows `"deviceConnected": false`
- Python error: "No ZKTeco devices found"

**Solutions:**

1. **Check USB connection:**

   - Unplug and replug scanner
   - Try different USB port
   - Check Device Manager (Windows)

2. **Verify ZKFinger SDK installation:**

   ```powershell
   # Check if SDK is installed
   cd employee/fingerprint-bridge/zkfinger-sdk
   .\CHECK_SDK_INSTALLATION.ps1
   ```

3. **Reinstall SDK:**

   ```powershell
   cd employee/fingerprint-bridge/zkfinger-sdk
   .\INSTALL_ZKFINGER_SDK.bat
   ```

4. **Test Python connection:**
   ```powershell
   python
   >>> from pyzkfp import ZKFP2
   >>> zkfp2 = ZKFP2()
   >>> zkfp2.Init()
   >>> zkfp2.GetDeviceCount()
   1  # Should show number of devices
   ```

---

#### Issue #3: "Bridge Server Won't Start"

**Symptoms:**

- `npm start` fails
- Error: "Port 3003 already in use"

**Solutions:**

1. **Kill existing process:**

   ```powershell
   # Find process on port 3003
   netstat -ano | findstr :3003

   # Kill process (replace PID)
   taskkill /F /PID <PID>
   ```

2. **Change port:**

   ```javascript
   // In bridge.js
   const PORT = 3004; // Use different port
   ```

3. **Check Windows Service:**

   ```powershell
   # If installed as service
   sc query FingerprintBridgeService

   # Stop service
   sc stop FingerprintBridgeService

   # Start manually
   npm start
   ```

---

#### Issue #4: "CORS Error from Vercel"

**Symptoms:**

- Browser console: "CORS policy blocked"
- Fingerprint login fails

**Solutions:**

1. **Check bridge is HTTPS:**

   - Bridge MUST run on HTTPS (not HTTP)
   - Verify: `https://localhost:3003/api/health`

2. **Accept SSL certificate:**

   - Visit `https://localhost:3003/api/health` in browser
   - Click "Advanced" → "Proceed to localhost"
   - Accept certificate warning

3. **Verify CORS in bridge.js:**
   ```javascript
   app.use(
     cors({
       origin: "*", // Allows all origins
       methods: ["GET", "POST", "OPTIONS"],
     })
   );
   ```

---

#### Issue #5: "Payroll Not Generating Automatically"

**Symptoms:**

- Cron job doesn't run
- No payroll on Sunday night

**Solutions:**

1. **Check if auto-payroll is enabled:**

   ```env
   # In config.env
   ENABLE_AUTO_PAYROLL=true
   ```

2. **Verify cron job is scheduled:**

   ```powershell
   # Check backend logs
   # Should see:
   ✅ Weekly payroll job scheduled
   ⏰ Next run: 2025-11-03T23:59:00.000Z
   ```

3. **Trigger manually for testing:**
   ```bash
   curl -X POST http://localhost:5000/api/admin/trigger-payroll \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

---

#### Issue #6: "Frontend Can't Connect to Backend"

**Symptoms:**

- Login fails with network error
- API calls return 404

**Solutions:**

1. **Verify backend is running:**

   ```powershell
   # Should show backend on port 5000
   netstat -ano | findstr :5000
   ```

2. **Check .env file:**

   ```env
   # In employee/.env
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Test backend directly:**

   ```powershell
   curl http://localhost:5000/api/
   ```

4. **Check CORS:**
   ```env
   # In employee/payroll-backend/config.env
   CORS_ORIGIN=http://localhost:5173
   ```

---

## 📄 License

This project is proprietary software owned by **RaeDisenyo** (Allan).

**All rights reserved.**

Unauthorized copying, modification, distribution, or use of this software is strictly prohibited without explicit written permission from the owner.

---

## 👥 Contributing

This is a private project. Contributions are by invitation only.

For feature requests or bug reports, contact the project owner.

---

## 📞 Support

For technical support or inquiries:

- **Owner:** Allan (RaeDisenyo)
- **Project:** Employee Attendance & Payroll Management System
- **Repository:** https://github.com/D4viiiid/Payroll-Management-System

---

## 🎉 Acknowledgments

- **ZKTeco** - For the Live20R/SLK20R fingerprint scanner hardware
- **MongoDB Atlas** - Cloud database hosting
- **Vercel** - Frontend and backend deployment platform
- **React Team** - React framework
- **Express.js** - Backend framework
- **pyzkfp Contributors** - Python library for ZKTeco devices

---

**System Version:** 2.0.0  
**Last Updated:** October 27, 2025  
**Documentation Status:** ✅ Complete & Up-to-Date

---

_This README provides complete installation and deployment instructions for the Employee Attendance & Payroll Management System with integrated biometric authentication via ZKTeco fingerprint scanners._

 
 
 
 * * E n v i r o n m e n t   V a r i a b l e s : * * 
 
 
 
 ` ` ` e n v 
 
 N O D E _ E N V = p r o d u c t i o n 
 
 P O R T = 5 0 0 0 
 
 M O N G O D B _ U R I = m o n g o d b + s r v : / / a d m i n 1 : a d m i n 1 1 1 1 @ c l u s t e r 0 . n o e v r r s . m o n g o d b . n e t / e m p l o y e e _ d b ? r e t r y W r i t e s = t r u e & w = m a j o r i t y & a p p N a m e = C l u s t e r 0 
 
 J W T _ S E C R E T = R a e D i s e n y o 2 0 2 5 _ S u p e r S e c u r e _ J W T _ K e y _ F o r _ P r o d u c t i o n _ P a y r o l l S y s t e m ! @ # $ % % 
 
 J W T _ E X P I R E S _ I N = 9 0 d 
 
 C O R S _ O R I G I N = h t t p s : / / e m p l o y e e - f r o n t e n d - e i g h t - r u s t . v e r c e l . a p p 
 
 F R O N T E N D _ U R L = h t t p s : / / e m p l o y e e - f r o n t e n d - e i g h t - r u s t . v e r c e l . a p p 
 
 E M A I L _ H O S T = s m t p . g m a i l . c o m 
 
 E M A I L _ P O R T = 5 8 7 
 
 E M A I L _ U S E R = y o u r - e m a i l @ g m a i l . c o m 
 
 E M A I L _ P A S S W O R D = y o u r - a p p - p a s s w o r d 
 
 R A T E _ L I M I T _ W I N D O W _ M S = 9 0 0 0 0 0 
 
 R A T E _ L I M I T _ M A X = 1 0 0 
 
 E N A B L E _ A U T O _ P A Y R O L L = t r u e 
 
 ` ` ` 
 
 
 
 # # # #   F r o n t e n d   ( V e r c e l ) 
 
 
 
 * * E n v i r o n m e n t   V a r i a b l e s : * * 
 
 
 
 ` ` ` e n v 
 
 V I T E _ A P I _ U R L = h t t p s : / / p a y r o l l - b a c k e n d - c y a n . v e r c e l . a p p / a p i 
 
 V I T E _ A P P _ E N V = p r o d u c t i o n 
 
 V I T E _ A P P _ N A M E = P a y r o l l   M a n a g e m e n t   S y s t e m 
 
 ` ` ` 
 
 
 
 # # # #   F i n g e r p r i n t   B r i d g e   ( L o c a l ) 
 
 
 
 * * E n v i r o n m e n t   V a r i a b l e s   ( ` c o n f i g . e n v ` ) : * * 
 
 
 
 ` ` ` e n v 
 
 M O N G O D B _ U R I = m o n g o d b + s r v : / / a d m i n 1 : a d m i n 1 1 1 1 @ c l u s t e r 0 . n o e v r r s . m o n g o d b . n e t / e m p l o y e e _ d b ? r e t r y W r i t e s = t r u e & w = m a j o r i t y & a p p N a m e = C l u s t e r 0 
 
 B R I D G E _ P O R T = 3 0 0 3 
 
 ` ` ` 
 
 
 
 - - - 
 
 
 
 # #   � xa�  D e p l o y m e n t 
 
 
 
 # # #   V e r c e l   D e p l o y m e n t   ( A u t o m a t i c ) 
 
 
 
 T h e   s y s t e m   i s   c o n f i g u r e d   f o r   a u t o m a t i c   d e p l o y m e n t   o n   V e r c e l : 
 
 
 
 * * F r o n t e n d : * *   h t t p s : / / e m p l o y e e - f r o n t e n d - e i g h t - r u s t . v e r c e l . a p p 
 
 * * B a c k e n d : * *   h t t p s : / / p a y r o l l - b a c k e n d - c y a n . v e r c e l . a p p 
 
 
 
 * * D e p l o y m e n t   W o r k f l o w : * * 
 
 
 
 1 .   P u s h   c o d e   t o   ` m a i n `   b r a n c h   o n   G i t H u b 
 
 2 .   V e r c e l   a u t o - d e t e c t s   c h a n g e s 
 
 3 .   R u n s   b u i l d   s c r i p t s 
 
 4 .   D e p l o y s   t o   p r o d u c t i o n   ( ~ 2   m i n u t e s ) 
 
 
 
 * * B u i l d   C o n f i g u r a t i o n : * * 
 
 
 
 * * F r o n t e n d   ( ` e m p l o y e e / v e r c e l . j s o n ` ) : * * 
 
 ` ` ` j s o n 
 
 { 
 
     " b u i l d C o m m a n d " :   " n p m   r u n   b u i l d " , 
 
     " o u t p u t D i r e c t o r y " :   " d i s t " , 
 
     " f r a m e w o r k " :   " v i t e " 
 
 } 
 
 ` ` ` 
 
 
 
 * * B a c k e n d   ( ` e m p l o y e e / p a y r o l l - b a c k e n d / v e r c e l . j s o n ` ) : * * 
 
 ` ` ` j s o n 
 
 { 
 
     " r e w r i t e s " :   [ 
 
         { 
 
             " s o u r c e " :   " / ( . * ) " , 
 
             " d e s t i n a t i o n " :   " / a p i " 
 
         } 
 
     ] 
 
 } 
 
 ` ` ` 
 
 
 
 * * P r e - d e p l o y m e n t   C h e c k l i s t : * * 
 
 
 
 -   [   ]   E n v i r o n m e n t   v a r i a b l e s   s e t   i n   V e r c e l   d a s h b o a r d 
 
 -   [   ]   M o n g o D B   A t l a s   I P   w h i t e l i s t   c o n f i g u r e d   ( 0 . 0 . 0 . 0 / 0   f o r   V e r c e l ) 
 
 -   [   ]   J W T * S E C R E T   i s   s t r o n g   a n d   u n i q u e 
 
 -   [   ]   E m a i l   c r e d e n t i a l s   c o n f i g u r e d 
 
 -   [   ]   C O R S * O R I G I N   m a t c h e s   f r o n t e n d   U R L 
 
 -   [   ]   B u i l d   c o m p l e t e s   l o c a l l y   w i t h o u t   e r r o r s 
 
 
 
 - - - 
 
 
 
 # #   � x   A P I   D o c u m e n t a t i o n 
 
 
 
 # # #   B a s e   U R L s 
 
 
 
 -   * * D e v e l o p m e n t : * *   ` h t t p : / / l o c a l h o s t : 5 0 0 0 / a p i ` 
 
 -   * * P r o d u c t i o n : * *   ` h t t p s : / / p a y r o l l - b a c k e n d - c y a n . v e r c e l . a p p / a p i ` 
 
 
 
 # # #   A u t h e n t i c a t i o n 
 
 
 
 A l l   p r o t e c t e d   e n d p o i n t s   r e q u i r e   J W T   t o k e n   i n   h e a d e r : 
 
 
 
 ` ` ` 
 
 A u t h o r i z a t i o n :   B e a r e r   < t o k e n > 
 
 ` ` ` 
 
 
 
 # # #   E n d p o i n t s 
 
 
 
 # # # #   A u t h e n t i c a t i o n 
 
 
 
 * * P O S T   / a p i / e m p l o y e e s / l o g i n * * 
 
 -   D e s c r i p t i o n :   L o g i n   w i t h   u s e r n a m e / p a s s w o r d 
 
 -   B o d y :   ` {   u s e r n a m e ,   p a s s w o r d   } ` 
 
 -   R e t u r n s :   ` {   s u c c e s s ,   t o k e n ,   e m p l o y e e   } ` 
 
 
 
 * * P O S T   / a p i / b i o m e t r i c / l o g i n * * 
 
 -   D e s c r i p t i o n :   L o g i n   w i t h   f i n g e r p r i n t 
 
 -   T r i g g e r s :   F i n g e r p r i n t   s c a n n e r   v i a   b r i d g e 
 
 -   R e t u r n s :   ` {   s u c c e s s ,   t o k e n ,   e m p l o y e e   } ` 
 
 
 
 # # # #   E m p l o y e e s 
 
 
 
 * * G E T   / a p i / e m p l o y e e s * * 
 
 -   D e s c r i p t i o n :   G e t   a l l   e m p l o y e e s 
 
 -   A u t h :   R e q u i r e d 
 
 -   R e t u r n s :   A r r a y   o f   e m p l o y e e   o b j e c t s 
 
 
 
 * * P O S T   / a p i / e m p l o y e e s * * 
 
 -   D e s c r i p t i o n :   C r e a t e   n e w   e m p l o y e e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   ` {   f i r s t N a m e ,   l a s t N a m e ,   e m a i l ,   c o n t a c t N u m b e r ,   p o s i t i o n ,   h i r e D a t e ,   s t a t u s   } ` 
 
 -   R e t u r n s :   C r e a t e d   e m p l o y e e   +   t r i g g e r s   f i n g e r p r i n t   e n r o l l m e n t 
 
 
 
 * * P U T   / a p i / e m p l o y e e s / : i d * * 
 
 -   D e s c r i p t i o n :   U p d a t e   e m p l o y e e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   U p d a t e d   f i e l d s 
 
 -   R e t u r n s :   U p d a t e d   e m p l o y e e 
 
 
 
 * * D E L E T E   / a p i / e m p l o y e e s / : i d * * 
 
 -   D e s c r i p t i o n :   D e l e t e   e m p l o y e e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   R e t u r n s :   S u c c e s s   m e s s a g e 
 
 
 
 # # # #   A t t e n d a n c e 
 
 
 
 * * G E T   / a p i / a t t e n d a n c e * * 
 
 -   D e s c r i p t i o n :   G e t   a l l   a t t e n d a n c e   r e c o r d s 
 
 -   A u t h :   R e q u i r e d 
 
 -   Q u e r y   p a r a m s :   ` ? d a t e = Y Y Y Y - M M - D D & e m p l o y e e I d = X X X ` 
 
 -   R e t u r n s :   A r r a y   o f   a t t e n d a n c e   r e c o r d s 
 
 
 
 * * P O S T   / a p i / a t t e n d a n c e * * 
 
 -   D e s c r i p t i o n :   R e c o r d   a t t e n d a n c e   m a n u a l l y 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   ` {   e m p l o y e e I d ,   d a t e ,   t i m e I n ,   t i m e O u t ,   s t a t u s   } ` 
 
 -   R e t u r n s :   C r e a t e d   a t t e n d a n c e   r e c o r d 
 
 
 
 * * P O S T   / a p i / b i o m e t r i c / c o n n e c t * * 
 
 -   D e s c r i p t i o n :   R e c o r d   a t t e n d a n c e   v i a   f i n g e r p r i n t 
 
 -   T r i g g e r s :   F i n g e r p r i n t   s c a n n e r   v i a   b r i d g e 
 
 -   R e t u r n s :   ` {   s u c c e s s ,   e m p l o y e e ,   a t t e n d a n c e   } ` 
 
 
 
 * * P U T   / a p i / a t t e n d a n c e / : i d * * 
 
 -   D e s c r i p t i o n :   U p d a t e   a t t e n d a n c e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   ` {   t i m e I n ,   t i m e O u t ,   r e m a r k s   } ` 
 
 -   R e t u r n s :   U p d a t e d   a t t e n d a n c e 
 
 
 
 # # # #   P a y r o l l 
 
 
 
 * * G E T   / a p i / p a y r o l l s * * 
 
 -   D e s c r i p t i o n :   G e t   a l l   p a y r o l l   r e c o r d s 
 
 -   A u t h :   R e q u i r e d 
 
 -   Q u e r y   p a r a m s :   ` ? s t a r t D a t e = X X X & e n d D a t e = X X X & e m p l o y e e I d = X X X ` 
 
 -   R e t u r n s :   A r r a y   o f   p a y r o l l   r e c o r d s 
 
 
 
 * * P O S T   / a p i / p a y r o l l s / g e n e r a t e * * 
 
 -   D e s c r i p t i o n :   G e n e r a t e   p a y r o l l   f o r   d a t e   r a n g e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   ` {   s t a r t D a t e ,   e n d D a t e ,   e m p l o y e e I d s   } ` 
 
 -   R e t u r n s :   G e n e r a t e d   p a y r o l l   r e c o r d s 
 
 
 
 * * P O S T   / a p i / a d m i n / t r i g g e r - p a y r o l l * * 
 
 -   D e s c r i p t i o n :   M a n u a l l y   t r i g g e r   w e e k l y   p a y r o l l   j o b 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   R e t u r n s :   P a y r o l l   g e n e r a t i o n   r e s u l t 
 
 
 
 * * G E T   / a p i / a d m i n / p a y r o l l - s t a t u s * * 
 
 -   D e s c r i p t i o n :   C h e c k   c u r r e n t   w e e k   p a y r o l l   s t a t u s 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   R e t u r n s :   P a y r o l l   s t a t u s   +   n e x t   r u n   t i m e 
 
 
 
 # # # #   S a l a r y   R a t e   M a n a g e m e n t 
 
 
 
 * * G E T   / a p i / s a l a r y - r a t e / h i s t o r y * * 
 
 -   D e s c r i p t i o n :   G e t   s a l a r y   r a t e   h i s t o r y   f o r   e m p l o y e e 
 
 -   A u t h :   P u b l i c   ( n o   a u t h   r e q u i r e d ) 
 
 -   Q u e r y :   ` ? e m p l o y e e I d = X X X ` 
 
 -   R e t u r n s :   A r r a y   o f   s a l a r y   r a t e   r e c o r d s 
 
 
 
 * * P O S T   / a p i / s a l a r y - r a t e * * 
 
 -   D e s c r i p t i o n :   C r e a t e / U p d a t e   s a l a r y   r a t e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   ` {   e m p l o y e e I d ,   d a i l y R a t e ,   h o u r l y R a t e ,   o v e r t i m e R a t e   } ` 
 
 -   R e t u r n s :   C r e a t e d   s a l a r y   r a t e 
 
 
 
 # # # #   D e d u c t i o n s 
 
 
 
 * * G E T   / a p i / d e d u c t i o n s * * 
 
 -   D e s c r i p t i o n :   G e t   a l l   d e d u c t i o n s 
 
 -   A u t h :   R e q u i r e d 
 
 -   R e t u r n s :   A r r a y   o f   d e d u c t i o n   r e c o r d s 
 
 
 
 * * P O S T   / a p i / d e d u c t i o n s * * 
 
 -   D e s c r i p t i o n :   C r e a t e   d e d u c t i o n 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   B o d y :   ` {   e m p l o y e e I d ,   t y p e ,   a m o u n t ,   d e s c r i p t i o n   } ` 
 
 -   R e t u r n s :   C r e a t e d   d e d u c t i o n 
 
 
 
 # # # #   C a s h   A d v a n c e s 
 
 
 
 * * G E T   / a p i / c a s h - a d v a n c e * * 
 
 -   D e s c r i p t i o n :   G e t   a l l   c a s h   a d v a n c e s 
 
 -   A u t h :   R e q u i r e d 
 
 -   R e t u r n s :   A r r a y   o f   c a s h   a d v a n c e   r e c o r d s 
 
 
 
 * * P O S T   / a p i / c a s h - a d v a n c e * * 
 
 -   D e s c r i p t i o n :   R e q u e s t   c a s h   a d v a n c e 
 
 -   A u t h :   R e q u i r e d 
 
 -   B o d y :   ` {   a m o u n t ,   r e a s o n   } ` 
 
 -   R e t u r n s :   C r e a t e d   c a s h   a d v a n c e 
 
 
 
 * * P U T   / a p i / c a s h - a d v a n c e / : i d / a p p r o v e * * 
 
 -   D e s c r i p t i o n :   A p p r o v e   c a s h   a d v a n c e 
 
 -   A u t h :   A d m i n   o n l y 
 
 -   R e t u r n s :   U p d a t e d   c a s h   a d v a n c e 
 
 
 
 # # # #   F i n g e r p r i n t   B r i d g e   H e a l t h 
 
 
 
 * * G E T   h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / h e a l t h * * 
 
 -   D e s c r i p t i o n :   C h e c k   b r i d g e   s e r v e r   s t a t u s 
 
 -   A u t h :   N o n e 
 
 -   R e t u r n s :   ` {   s u c c e s s ,   d e v i c e C o n n e c t e d ,   v e r s i o n   } ` 
 
 
 
 * * P O S T   h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / f i n g e r p r i n t / e n r o l l * * 
 
 -   D e s c r i p t i o n :   E n r o l l   f i n g e r p r i n t   f o r   e m p l o y e e 
 
 -   A u t h :   N o n e   ( l o c a l   o n l y ) 
 
 -   B o d y :   ` {   e m p l o y e e I d ,   f i r s t N a m e ,   l a s t N a m e ,   e m a i l   } ` 
 
 -   R e t u r n s :   ` {   s u c c e s s ,   f i n g e r p r i n t T e m p l a t e   } ` 
 
 
 
 - - - 
 
 
 
 # #   � x �   B i o m e t r i c   I n t e g r a t i o n 
 
 
 
 # # #   H o w   F i n g e r p r i n t   L o g i n   W o r k s 
 
 
 
 # # # #   1 .   U s e r   C l i c k s   " L o g i n   w i t h   F i n g e r p r i n t " 
 
 
 
 ` ` ` j a v a s c r i p t 
 
 / /   F r o n t e n d :   L o g i n . j s x 
 
 c o n s t   h a n d l e B i o m e t r i c L o g i n   =   a s y n c   ( )   = >   { 
 
     t r y   { 
 
         / /   C h e c k   i f   b r i d g e   i s   r u n n i n g 
 
         c o n s t   b r i d g e H e a l t h   =   a w a i t   f e t c h ( ' h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / h e a l t h ' ) ; 
 
         i f   ( ! b r i d g e H e a l t h . o k )   { 
 
             a l e r t ( ' F i n g e r p r i n t   s c a n n e r   n o t   c o n n e c t e d ! ' ) ; 
 
             r e t u r n ; 
 
         } 
 
 
 
         s e t M e s s a g e ( ' � x     P l a c e   f i n g e r   o n   s c a n n e r . . . ' ) ; 
 
 
 
         / /   C a l l   b r i d g e   s e r v e r 
 
         c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ' h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / f i n g e r p r i n t / l o g i n ' ,   { 
 
             m e t h o d :   ' P O S T ' 
 
         } ) ; 
 
 
 
         c o n s t   r e s u l t   =   a w a i t   r e s p o n s e . j s o n ( ) ; 
 
 
 
         i f   ( r e s u l t . s u c c e s s   & &   r e s u l t . e m p l o y e e )   { 
 
             / /   S t o r e   t o k e n 
 
             l o c a l S t o r a g e . s e t I t e m ( ' t o k e n ' ,   r e s u l t . t o k e n ) ; 
 
             l o c a l S t o r a g e . s e t I t e m ( ' u s e r ' ,   J S O N . s t r i n g i f y ( r e s u l t . e m p l o y e e ) ) ; 
 
 
 
             / /   R e d i r e c t   t o   d a s h b o a r d 
 
             n a v i g a t e ( ' / d a s h b o a r d ' ) ; 
 
         }   e l s e   { 
 
             a l e r t ( ' � � R  F i n g e r p r i n t   n o t   r e c o g n i z e d ' ) ; 
 
         } 
 
     }   c a t c h   ( e r r o r )   { 
 
         a l e r t ( ' � � R  S c a n n e r   e r r o r :   '   +   e r r o r . m e s s a g e ) ; 
 
     } 
 
 } ; 
 
 ` ` ` 
 
 
 
 # # # #   2 .   B r i d g e   S e r v e r   R e c e i v e s   R e q u e s t 
 
 
 
 ` ` ` j a v a s c r i p t 
 
 / /   B r i d g e   S e r v e r :   b r i d g e . j s 
 
 a p p . p o s t ( ' / a p i / f i n g e r p r i n t / l o g i n ' ,   a s y n c   ( r e q ,   r e s )   = >   { 
 
     t r y   { 
 
         / /   E x e c u t e   P y t h o n   s c r i p t   w i t h   - - l o g i n   f l a g 
 
         c o n s t   r e s u l t   =   a w a i t   e x e c u t e P y t h o n ( C A P T U R E _ S C R I P T ,   [ ' - - l o g i n ' ] ) ; 
 
 
 
         r e s . j s o n ( r e s u l t ) ; 
 
     }   c a t c h   ( e r r o r )   { 
 
         r e s . s t a t u s ( 5 0 0 ) . j s o n ( { 
 
             s u c c e s s :   f a l s e , 
 
             m e s s a g e :   ' F i n g e r p r i n t   l o g i n   f a i l e d ' , 
 
             e r r o r :   e r r o r . m e s s a g e 
 
         } ) ; 
 
     } 
 
 } ) ; 
 
 ` ` ` 
 
 
 
 # # # #   3 .   P y t h o n   S c r i p t   C a p t u r e s   F i n g e r p r i n t 
 
 
 
 ` ` ` p y t h o n 
 
 #   P y t h o n :   c a p t u r e _ f i n g e r p r i n t _ i p c _ c o m p l e t e . p y 
 
 f r o m   p y z k f p   i m p o r t   Z K F P 2 
 
 i m p o r t   p y m o n g o 
 
 i m p o r t   s y s 
 
 
 
 #   I n i t i a l i z e   Z K T e c o   d e v i c e 
 
 z k f p 2   =   Z K F P 2 ( ) 
 
 z k f p 2 . I n i t ( ) 
 
 z k f p 2 . O p e n D e v i c e ( 0 ) 
 
 
 
 #   C a p t u r e   f i n g e r p r i n t 
 
 t m p ,   i m g   =   z k f p 2 . A c q u i r e F i n g e r p r i n t ( ) 
 
 
 
 #   C o n n e c t   t o   M o n g o D B 
 
 c l i e n t   =   p y m o n g o . M o n g o C l i e n t ( o s . g e t e n v ( ' M O N G O D B _ U R I ' ) ) 
 
 d b   =   c l i e n t [ ' e m p l o y e e _ d b ' ] 
 
 
 
 #   S e a r c h   f o r   m a t c h i n g   f i n g e r p r i n t 
 
 e m p l o y e e s   =   d b . e m p l o y e e s . f i n d ( { ' f i n g e r p r i n t E n r o l l e d ' :   T r u e } ) 
 
 
 
 f o r   e m p   i n   e m p l o y e e s : 
 
         s t o r e d _ t e m p l a t e   =   b a s e 6 4 . b 6 4 d e c o d e ( e m p [ ' f i n g e r p r i n t T e m p l a t e ' ] ) 
 
         
 
         #   V e r i f y   m a t c h 
 
         r e t   =   z k f p 2 . D B M a t c h ( t m p [ 0 ] ,   s t o r e d _ t e m p l a t e ) 
 
         
 
         i f   r e t   >   0 :     #   M a t c h   f o u n d ! 
 
                 #   G e n e r a t e   J W T   t o k e n 
 
                 t o k e n   =   j w t . e n c o d e ( { 
 
                         ' i d ' :   s t r ( e m p [ ' _ i d ' ] ) , 
 
                         ' u s e r n a m e ' :   e m p [ ' u s e r n a m e ' ] , 
 
                         ' i s A d m i n ' :   e m p . g e t ( ' i s A d m i n ' ,   F a l s e ) 
 
                 } ,   J W T _ S E C R E T ,   a l g o r i t h m = ' H S 2 5 6 ' ) 
 
                 
 
                 #   R e t u r n   e m p l o y e e   d a t a   +   t o k e n 
 
                 p r i n t ( j s o n . d u m p s ( { 
 
                         ' s u c c e s s ' :   T r u e , 
 
                         ' e m p l o y e e ' :   { 
 
                                 ' _ i d ' :   s t r ( e m p [ ' _ i d ' ] ) , 
 
                                 ' f i r s t N a m e ' :   e m p [ ' f i r s t N a m e ' ] , 
 
                                 ' l a s t N a m e ' :   e m p [ ' l a s t N a m e ' ] , 
 
                                 ' e m a i l ' :   e m p [ ' e m a i l ' ] 
 
                         } , 
 
                         ' t o k e n ' :   t o k e n , 
 
                         ' m e s s a g e ' :   ' L o g i n   s u c c e s s f u l ' 
 
                 } ) ) 
 
                 s y s . e x i t ( 0 ) 
 
 
 
 #   N o   m a t c h   f o u n d 
 
 p r i n t ( j s o n . d u m p s ( { 
 
         ' s u c c e s s ' :   F a l s e , 
 
         ' m e s s a g e ' :   ' F i n g e r p r i n t   n o t   r e c o g n i z e d ' 
 
 } ) ) 
 
 ` ` ` 
 
 
 
 # # # #   4 .   F r o n t e n d   R e c e i v e s   R e s p o n s e 
 
 
 
 U s e r   i s   l o g g e d   i n   a n d   r e d i r e c t e d   t o   d a s h b o a r d !   � S&
 
 
 
 - - - 
 
 
 
 # # #   F i n g e r p r i n t   E n r o l l m e n t   F l o w 
 
 
 
 # # # #   1 .   A d m i n   C r e a t e s   N e w   E m p l o y e e 
 
 
 
 ` ` ` j a v a s c r i p t 
 
 / /   F r o n t e n d :   E m p l o y e e . j s x 
 
 c o n s t   h a n d l e A d d E m p l o y e e   =   a s y n c   ( e m p l o y e e D a t a )   = >   { 
 
     c o n s t   r e s p o n s e   =   a w a i t   f e t c h ( ' / a p i / e m p l o y e e s ' ,   { 
 
         m e t h o d :   ' P O S T ' , 
 
         h e a d e r s :   { 
 
             ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n ' , 
 
             ' A u t h o r i z a t i o n ' :   ` B e a r e r   $ { t o k e n } ` 
 
         } , 
 
         b o d y :   J S O N . s t r i n g i f y ( e m p l o y e e D a t a ) 
 
     } ) ; 
 
 
 
     c o n s t   r e s u l t   =   a w a i t   r e s p o n s e . j s o n ( ) ; 
 
 
 
     i f   ( r e s u l t . s u c c e s s )   { 
 
         a l e r t ( ' � S&   E m p l o y e e   c r e a t e d !   E n r o l l i n g   f i n g e r p r i n t . . . ' ) ; 
 
         / /   E n r o l l m e n t   h a p p e n s   a u t o m a t i c a l l y   i n   b a c k e n d 
 
     } 
 
 } ; 
 
 ` ` ` 
 
 
 
 # # # #   2 .   B a c k e n d   T r i g g e r s   E n r o l l m e n t 
 
 
 
 ` ` ` j a v a s c r i p t 
 
 / /   B a c k e n d :   E m p l o y e e . j s   r o u t e 
 
 r o u t e r . p o s t ( ' / ' ,   a u t h ,   a d m i n A u t h ,   a s y n c   ( r e q ,   r e s )   = >   { 
 
     / /   C r e a t e   e m p l o y e e   i n   d a t a b a s e 
 
     c o n s t   e m p l o y e e   =   a w a i t   E m p l o y e e . c r e a t e ( r e q . b o d y ) ; 
 
 
 
     / /   T r i g g e r   f i n g e r p r i n t   e n r o l l m e n t   v i a   b r i d g e 
 
     c o n s t   b r i d g e R e s p o n s e   =   a w a i t   f e t c h ( ' h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / f i n g e r p r i n t / e n r o l l ' ,   { 
 
         m e t h o d :   ' P O S T ' , 
 
         h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } , 
 
         b o d y :   J S O N . s t r i n g i f y ( { 
 
             e m p l o y e e I d :   e m p l o y e e . _ i d , 
 
             f i r s t N a m e :   e m p l o y e e . f i r s t N a m e , 
 
             l a s t N a m e :   e m p l o y e e . l a s t N a m e , 
 
             e m a i l :   e m p l o y e e . e m a i l 
 
         } ) 
 
     } ) ; 
 
 
 
     c o n s t   e n r o l l m e n t R e s u l t   =   a w a i t   b r i d g e R e s p o n s e . j s o n ( ) ; 
 
 
 
     i f   ( e n r o l l m e n t R e s u l t . s u c c e s s )   { 
 
         / /   U p d a t e   e m p l o y e e   w i t h   f i n g e r p r i n t   t e m p l a t e 
 
         e m p l o y e e . f i n g e r p r i n t T e m p l a t e   =   e n r o l l m e n t R e s u l t . f i n g e r p r i n t T e m p l a t e ; 
 
         e m p l o y e e . f i n g e r p r i n t E n r o l l e d   =   t r u e ; 
 
         a w a i t   e m p l o y e e . s a v e ( ) ; 
 
     } 
 
 
 
     r e s . j s o n ( {   s u c c e s s :   t r u e ,   e m p l o y e e   } ) ; 
 
 } ) ; 
 
 ` ` ` 
 
 
 
 # # # #   3 .   B r i d g e   E x e c u t e s   E n r o l l m e n t   S c r i p t 
 
 
 
 ` ` ` p y t h o n 
 
 #   P y t h o n :   e n r o l l _ f i n g e r p r i n t _ c l i . p y 
 
 i m p o r t   s y s 
 
 i m p o r t   j s o n 
 
 
 
 e m p l o y e e _ d a t a   =   j s o n . l o a d s ( s y s . a r g v [ 2 ] ) 
 
 
 
 #   I n i t i a l i z e   d e v i c e 
 
 z k f p 2   =   Z K F P 2 ( ) 
 
 z k f p 2 . I n i t ( ) 
 
 z k f p 2 . O p e n D e v i c e ( 0 ) 
 
 
 
 p r i n t ( f " E n r o l l i n g   f i n g e r p r i n t   f o r :   { e m p l o y e e _ d a t a [ ' f i r s t N a m e ' ] }   { e m p l o y e e _ d a t a [ ' l a s t N a m e ' ] } " ) 
 
 
 
 #   C a p t u r e   3   f i n g e r p r i n t s 
 
 t e m p l a t e s   =   [ ] 
 
 f o r   i   i n   r a n g e ( 3 ) : 
 
         p r i n t ( f " \ n S c a n   # { i + 1 } / 3   -   P l a c e   f i n g e r   o n   s c a n n e r . . . " ) 
 
         t m p ,   i m g   =   z k f p 2 . A c q u i r e F i n g e r p r i n t ( ) 
 
         t e m p l a t e s . a p p e n d ( t m p [ 0 ] ) 
 
         p r i n t ( " � S&   C a p t u r e d ! " ) 
 
 
 
 #   M e r g e   t e m p l a t e s 
 
 m e r g e d _ t e m p l a t e ,   m e r g e d _ s i z e   =   z k f p 2 . D B M e r g e ( * t e m p l a t e s ) 
 
 
 
 #   E n c o d e   t o   b a s e 6 4 
 
 t e m p l a t e _ b 6 4   =   b a s e 6 4 . b 6 4 e n c o d e ( m e r g e d _ t e m p l a t e ) . d e c o d e ( ' u t f - 8 ' ) 
 
 
 
 #   R e t u r n   r e s u l t 
 
 p r i n t ( j s o n . d u m p s ( { 
 
         ' s u c c e s s ' :   T r u e , 
 
         ' f i n g e r p r i n t T e m p l a t e ' :   t e m p l a t e _ b 6 4 , 
 
         ' t e m p l a t e L e n g t h ' :   m e r g e d _ s i z e , 
 
         ' m e s s a g e ' :   ' F i n g e r p r i n t   e n r o l l e d   s u c c e s s f u l l y ' 
 
 } ) ) 
 
 ` ` ` 
 
 
 
 # # # #   4 .   E m p l o y e e   C a n   N o w   L o g i n   w i t h   F i n g e r p r i n t !   � x}0
 
 
 
 - - - 
 
 
 
 # #   � x� :  T r o u b l e s h o o t i n g 
 
 
 
 # # #   C o m m o n   I s s u e s   a n d   S o l u t i o n s 
 
 
 
 # # # #   I s s u e   # 1 :   " M o n g o D B   C o n n e c t i o n   F a i l e d " 
 
 
 
 * * S y m p t o m s : * * 
 
 -   B a c k e n d   w o n ' t   s t a r t 
 
 -   E r r o r :   " M o n g o D B   c o n n e c t i o n   e r r o r " 
 
 
 
 * * S o l u t i o n s : * * 
 
 
 
 1 .   * * C h e c k   M o n g o D B   U R I : * * 
 
       ` ` ` p o w e r s h e l l 
 
       #   I n   c o n f i g . e n v ,   v e r i f y : 
 
       M O N G O D B _ U R I = m o n g o d b + s r v : / / a d m i n 1 : a d m i n 1 1 1 1 @ c l u s t e r 0 . n o e v r r s . m o n g o d b . n e t / e m p l o y e e _ d b 
 
       ` ` ` 
 
 
 
 2 .   * * V e r i f y   M o n g o D B   A t l a s   I P   W h i t e l i s t : * * 
 
       -   G o   t o   M o n g o D B   A t l a s   d a s h b o a r d 
 
       -   N e t w o r k   A c c e s s   �    I P   W h i t e l i s t 
 
       -   A d d   ` 0 . 0 . 0 . 0 / 0 `   ( a l l o w   a l l   I P s   f o r   V e r c e l ) 
 
 
 
 3 .   * * T e s t   c o n n e c t i o n : * * 
 
       ` ` ` p o w e r s h e l l 
 
       c d   e m p l o y e e / p a y r o l l - b a c k e n d 
 
       n o d e   t e s t - d b . j s 
 
       ` ` ` 
 
 
 
 - - - 
 
 
 
 # # # #   I s s u e   # 2 :   " F i n g e r p r i n t   S c a n n e r   N o t   D e t e c t e d " 
 
 
 
 * * S y m p t o m s : * * 
 
 -   B r i d g e   h e a l t h   s h o w s   ` " d e v i c e C o n n e c t e d " :   f a l s e ` 
 
 -   P y t h o n   e r r o r :   " N o   Z K T e c o   d e v i c e s   f o u n d " 
 
 
 
 * * S o l u t i o n s : * * 
 
 
 
 1 .   * * C h e c k   U S B   c o n n e c t i o n : * * 
 
       -   U n p l u g   a n d   r e p l u g   s c a n n e r 
 
       -   T r y   d i f f e r e n t   U S B   p o r t 
 
       -   C h e c k   D e v i c e   M a n a g e r   ( W i n d o w s ) 
 
 
 
 2 .   * * V e r i f y   Z K F i n g e r   S D K   i n s t a l l a t i o n : * * 
 
       ` ` ` p o w e r s h e l l 
 
       #   C h e c k   i f   S D K   i s   i n s t a l l e d 
 
       c d   e m p l o y e e / f i n g e r p r i n t - b r i d g e / z k f i n g e r - s d k 
 
       . \ C H E C K _ S D K _ I N S T A L L A T I O N . p s 1 
 
       ` ` ` 
 
 
 
 3 .   * * R e i n s t a l l   S D K : * * 
 
       ` ` ` p o w e r s h e l l 
 
       c d   e m p l o y e e / f i n g e r p r i n t - b r i d g e / z k f i n g e r - s d k 
 
       . \ I N S T A L L _ Z K F I N G E R _ S D K . b a t 
 
       ` ` ` 
 
 
 
 4 .   * * T e s t   P y t h o n   c o n n e c t i o n : * * 
 
       ` ` ` p o w e r s h e l l 
 
       p y t h o n 
 
       > > >   f r o m   p y z k f p   i m p o r t   Z K F P 2 
 
       > > >   z k f p 2   =   Z K F P 2 ( ) 
 
       > > >   z k f p 2 . I n i t ( ) 
 
       > > >   z k f p 2 . G e t D e v i c e C o u n t ( ) 
 
       1     #   S h o u l d   s h o w   n u m b e r   o f   d e v i c e s 
 
       ` ` ` 
 
 
 
 - - - 
 
 
 
 # # # #   I s s u e   # 3 :   " B r i d g e   S e r v e r   W o n ' t   S t a r t " 
 
 
 
 * * S y m p t o m s : * * 
 
 -   ` n p m   s t a r t `   f a i l s 
 
 -   E r r o r :   " P o r t   3 0 0 3   a l r e a d y   i n   u s e " 
 
 
 
 * * S o l u t i o n s : * * 
 
 
 
 1 .   * * K i l l   e x i s t i n g   p r o c e s s : * * 
 
       ` ` ` p o w e r s h e l l 
 
       #   F i n d   p r o c e s s   o n   p o r t   3 0 0 3 
 
       n e t s t a t   - a n o   |   f i n d s t r   : 3 0 0 3 
 
       
 
       #   K i l l   p r o c e s s   ( r e p l a c e   P I D ) 
 
       t a s k k i l l   / F   / P I D   < P I D > 
 
       ` ` ` 
 
 
 
 2 .   * * C h a n g e   p o r t : * * 
 
       ` ` ` j a v a s c r i p t 
 
       / /   I n   b r i d g e . j s 
 
       c o n s t   P O R T   =   3 0 0 4 ;   / /   U s e   d i f f e r e n t   p o r t 
 
       ` ` ` 
 
 
 
 3 .   * * C h e c k   W i n d o w s   S e r v i c e : * * 
 
       ` ` ` p o w e r s h e l l 
 
       #   I f   i n s t a l l e d   a s   s e r v i c e 
 
       s c   q u e r y   F i n g e r p r i n t B r i d g e S e r v i c e 
 
       
 
       #   S t o p   s e r v i c e 
 
       s c   s t o p   F i n g e r p r i n t B r i d g e S e r v i c e 
 
       
 
       #   S t a r t   m a n u a l l y 
 
       n p m   s t a r t 
 
       ` ` ` 
 
 
 
 - - - 
 
 
 
 # # # #   I s s u e   # 4 :   " C O R S   E r r o r   f r o m   V e r c e l " 
 
 
 
 * * S y m p t o m s : * * 
 
 -   B r o w s e r   c o n s o l e :   " C O R S   p o l i c y   b l o c k e d " 
 
 -   F i n g e r p r i n t   l o g i n   f a i l s 
 
 
 
 * * S o l u t i o n s : * * 
 
 
 
 1 .   * * C h e c k   b r i d g e   i s   H T T P S : * * 
 
       -   B r i d g e   M U S T   r u n   o n   H T T P S   ( n o t   H T T P ) 
 
       -   V e r i f y :   ` h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / h e a l t h ` 
 
 
 
 2 .   * * A c c e p t   S S L   c e r t i f i c a t e : * * 
 
       -   V i s i t   ` h t t p s : / / l o c a l h o s t : 3 0 0 3 / a p i / h e a l t h `   i n   b r o w s e r 
 
       -   C l i c k   " A d v a n c e d "   �    " P r o c e e d   t o   l o c a l h o s t " 
 
       -   A c c e p t   c e r t i f i c a t e   w a r n i n g 
 
 
 
 3 .   * * V e r i f y   C O R S   i n   b r i d g e . j s : * * 
 
       ` ` ` j a v a s c r i p t 
 
       a p p . u s e ( c o r s ( { 
 
           o r i g i n :   ' * ' ,   / /   A l l o w s   a l l   o r i g i n s 
 
           m e t h o d s :   [ ' G E T ' ,   ' P O S T ' ,   ' O P T I O N S ' ] 
 
       } ) ) ; 
 
       ` ` ` 
 
 
 
 - - - 
 
 
 
 # # # #   I s s u e   # 5 :   " P a y r o l l   N o t   G e n e r a t i n g   A u t o m a t i c a l l y " 
 
 
 
 * * S y m p t o m s : * * 
 
 -   C r o n   j o b   d o e s n ' t   r u n 
 
 -   N o   p a y r o l l   o n   S u n d a y   n i g h t 
 
 
 
 * * S o l u t i o n s : * * 
 
 
 
 1 .   * * C h e c k   i f   a u t o - p a y r o l l   i s   e n a b l e d : * * 
 
       ` ` ` e n v 
 
       #   I n   c o n f i g . e n v 
 
       E N A B L E _ A U T O _ P A Y R O L L = t r u e 
 
       ` ` ` 
 
 
 
 2 .   * * V e r i f y   c r o n   j o b   i s   s c h e d u l e d : * * 
 
       ` ` ` p o w e r s h e l l 
 
       #   C h e c k   b a c k e n d   l o g s 
 
       #   S h o u l d   s e e : 
 
       � S&   W e e k l y   p a y r o l l   j o b   s c h e d u l e d 
 
       � � �   N e x t   r u n :   2 0 2 5 - 1 1 - 0 3 T 2 3 : 5 9 : 0 0 . 0 0 0 Z 
 
       ` ` ` 
 
 
 
 3 .   * * T r i g g e r   m a n u a l l y   f o r   t e s t i n g : * * 
 
       ` ` ` b a s h 
 
       c u r l   - X   P O S T   h t t p : / / l o c a l h o s t : 5 0 0 0 / a p i / a d m i n / t r i g g e r - p a y r o l l   \ 
 
           - H   " A u t h o r i z a t i o n :   B e a r e r   Y O U R _ A D M I N _ T O K E N " 
 
       ` ` ` 
 
 
 
 - - - 
 
 
 
 # # # #   I s s u e   # 6 :   " F r o n t e n d   C a n ' t   C o n n e c t   t o   B a c k e n d " 
 
 
 
 * * S y m p t o m s : * * 
 
 -   L o g i n   f a i l s   w i t h   n e t w o r k   e r r o r 
 
 -   A P I   c a l l s   r e t u r n   4 0 4 
 
 
 
 * * S o l u t i o n s : * * 
 
 
 
 1 .   * * V e r i f y   b a c k e n d   i s   r u n n i n g : * * 
 
       ` ` ` p o w e r s h e l l 
 
       #   S h o u l d   s h o w   b a c k e n d   o n   p o r t   5 0 0 0 
 
       n e t s t a t   - a n o   |   f i n d s t r   : 5 0 0 0 
 
       ` ` ` 
 
 
 
 2 .   * * C h e c k   . e n v   f i l e : * * 
 
       ` ` ` e n v 
 
       #   I n   e m p l o y e e / . e n v 
 
       V I T E _ A P I _ U R L = h t t p : / / l o c a l h o s t : 5 0 0 0 / a p i 
 
       ` ` ` 
 
 
 
 3 .   * * T e s t   b a c k e n d   d i r e c t l y : * * 
 
       ` ` ` p o w e r s h e l l 
 
       c u r l   h t t p : / / l o c a l h o s t : 5 0 0 0 / a p i / 
 
       ` ` ` 
 
 
 
 4 .   * * C h e c k   C O R S : * * 
 
       ` ` ` e n v 
 
       #   I n   e m p l o y e e / p a y r o l l - b a c k e n d / c o n f i g . e n v 
 
       C O R S _ O R I G I N = h t t p : / / l o c a l h o s t : 5 1 7 3 
 
       ` ` ` 
 
 
 
 - - - 
 
 
 
 # #   � x   L i c e n s e 
 
 
 
 T h i s   p r o j e c t   i s   p r o p r i e t a r y   s o f t w a r e   o w n e d   b y   * * R a e D i s e n y o * *   ( A l l a n ) . 
 
 
 
 * * A l l   r i g h t s   r e s e r v e d . * * 
 
 
 
 U n a u t h o r i z e d   c o p y i n g ,   m o d i f i c a t i o n ,   d i s t r i b u t i o n ,   o r   u s e   o f   t h i s   s o f t w a r e   i s   s t r i c t l y   p r o h i b i t e d   w i t h o u t   e x p l i c i t   w r i t t e n   p e r m i s s i o n   f r o m   t h e   o w n e r . 
 
 
 
 - - - 
 
 
 
 # #   � x �   C o n t r i b u t i n g 
 
 
 
 T h i s   i s   a   p r i v a t e   p r o j e c t .   C o n t r i b u t i o n s   a r e   b y   i n v i t a t i o n   o n l y . 
 
 
 
 F o r   f e a t u r e   r e q u e s t s   o r   b u g   r e p o r t s ,   c o n t a c t   t h e   p r o j e c t   o w n e r . 
 
 
 
 - - - 
 
 
 
 # #   � x ~  S u p p o r t 
 
 
 
 F o r   t e c h n i c a l   s u p p o r t   o r   i n q u i r i e s : 
 
 
 
 -   * * O w n e r : * *   A l l a n   ( R a e D i s e n y o ) 
 
 -   * * P r o j e c t : * *   E m p l o y e e   A t t e n d a n c e   &   P a y r o l l   M a n a g e m e n t   S y s t e m 
 
 -   * * R e p o s i t o r y : * *   h t t p s : / / g i t h u b . c o m / D 4 v i i i i d / P a y r o l l - M a n a g e m e n t - S y s t e m 
 
 
 
 - - - 
 
 
 
 # #   � x}0  A c k n o w l e d g m e n t s 
 
 
 
 -   * * Z K T e c o * *   -   F o r   t h e   L i v e 2 0 R / S L K 2 0 R   f i n g e r p r i n t   s c a n n e r   h a r d w a r e 
 
 -   * * M o n g o D B   A t l a s * *   -   C l o u d   d a t a b a s e   h o s t i n g 
 
 -   * * V e r c e l * *   -   F r o n t e n d   a n d   b a c k e n d   d e p l o y m e n t   p l a t f o r m 
 
 -   * * R e a c t   T e a m * *   -   R e a c t   f r a m e w o r k 
 
 -   * * E x p r e s s . j s * *   -   B a c k e n d   f r a m e w o r k 
 
 -   * * p y z k f p   C o n t r i b u t o r s * *   -   P y t h o n   l i b r a r y   f o r   Z K T e c o   d e v i c e s 
 
 
 
 - - - 
 
 
 
 * * S y s t e m   V e r s i o n : * *   2 . 0 . 0     
 
 * * L a s t   U p d a t e d : * *   O c t o b e r   2 7 ,   2 0 2 5     
 
 * * D o c u m e n t a t i o n   S t a t u s : * *   � S&  C o m p l e t e   &   U p - t o - D a t e 
 
 
 
 - - - 
 
 
 
 * T h i s   R E A D M E   p r o v i d e s   c o m p l e t e   i n s t a l l a t i o n   a n d   d e p l o y m e n t   i n s t r u c t i o n s   f o r   t h e   E m p l o y e e   A t t e n d a n c e   &   P a y r o l l   M a n a g e m e n t   S y s t e m   w i t h   i n t e g r a t e d   b i o m e t r i c   a u t h e n t i c a t i o n   v i a   Z K T e c o   f i n g e r p r i n t   s c a n n e r s . * 
 
 
