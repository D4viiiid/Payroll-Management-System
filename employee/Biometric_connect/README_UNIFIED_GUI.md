# Unified Biometric System GUI

## 🎯 Overview

The Unified Biometric System GUI combines both **Employee Registration** and **Attendance Recording** functionality in a single application. This solves the device connection conflict issue where the ZKTeco fingerprint device cannot be connected to multiple applications simultaneously.

## 🚀 Features

### ✅ Single Application
- **No more switching between GUIs** - Everything in one place
- **Single device connection** - No conflicts between registration and attendance
- **Unified interface** - Tabbed design for easy navigation

### 📝 Employee Registration Tab
- Complete employee information form
- Auto-generated Employee ID, Username, and Password
- 3-scan fingerprint registration process
- Real-time duplicate detection
- MongoDB backend integration
- Registered users list with delete functionality
- Activity logging

### ⏰ Attendance Recording Tab
- Single-scan fingerprint identification
- Automatic Time In/Time Out detection
- Half Day detection (late arrivals after 9:30 AM)
- Automatic deduction creation
- Real-time attendance status display
- Backend synchronization

### 📋 System Logs Tab
- Real-time system monitoring
- Device connection status
- Registration and attendance logs
- Error tracking and debugging

## 🛠️ Installation

### Prerequisites
```bash
pip install pyzkfp pillow requests
```

### Files Required
- `biometric_system_gui.py` - Main unified GUI application
- `test_unified_gui.py` - Test script to verify installation

## 🎮 Usage

### 1. Start the Application
```bash
cd employee/Biometric_connect
python biometric_system_gui.py
```

### 2. Connect Device
- Click "Connect Device" in the Device Status section
- Wait for green "Connected" status
- Device is now ready for both registration and attendance

### 3. Employee Registration
1. Go to **Employee Registration** tab
2. Fill out employee information:
   - First Name *
   - Last Name *
   - Email *
   - Contact Number *
   - Employment Status * (regular/oncall)
   - Date Hired *
3. Auto-generated fields will populate automatically
4. Click "Start Fingerprint Registration"
5. Scan finger 3 times as prompted
6. System will check for duplicates and save to MongoDB

### 4. Attendance Recording
1. Go to **Attendance Recording** tab
2. Click "Scan Fingerprint for Attendance"
3. Scan finger once
4. System will:
   - Identify the employee
   - Record Time In or Time Out
   - Detect Half Day if late
   - Create deductions automatically
   - Update web dashboard

### 5. Monitor System
- Check **System Logs** tab for real-time updates
- View registered users in the right panel
- Delete users if needed

## 🔧 Technical Details

### Device Management
- **Single Connection**: Device connects once and is shared between tabs
- **Auto-Reconnection**: Handles "Invalid Handle" errors automatically
- **Error Recovery**: Robust error handling and device recovery

### Backend Integration
- **MongoDB**: Direct database integration
- **REST API**: Communication with Node.js backend
- **Real-time Sync**: Automatic web dashboard updates

### Security Features
- **Duplicate Detection**: Prevents duplicate fingerprint registration
- **Template Validation**: Ensures fingerprint quality
- **Backend Verification**: Server-side duplicate checking

## 🎉 Benefits

### ✅ For Users
- **No GUI Switching**: Everything in one application
- **Better UX**: Intuitive tabbed interface
- **Real-time Feedback**: Immediate status updates
- **Error Prevention**: Built-in validation and checks

### ✅ For Administrators
- **Single Device Management**: No connection conflicts
- **Complete Logging**: Full system monitoring
- **Easy Maintenance**: Centralized user management
- **Reliable Operation**: Robust error handling

## 🔍 Troubleshooting

### Device Connection Issues
- Ensure only one GUI is running
- Use "Reconnect Device" if needed
- Check device drivers and USB connection

### Backend Connection Issues
- Verify Node.js server is running on port 5000
- Check MongoDB connection
- Review System Logs tab for errors

### Registration Issues
- Ensure all required fields are filled
- Check for duplicate fingerprints
- Verify backend server is running

## 📊 System Requirements

- **Python**: 3.7+
- **OS**: Windows 10/11
- **Hardware**: ZKTeco fingerprint device
- **Backend**: Node.js server with MongoDB
- **Dependencies**: pyzkfp, pillow, requests

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   pip install pyzkfp pillow requests
   ```

2. **Start backend server**:
   ```bash
   cd ../payroll-backend
   node server.js
   ```

3. **Launch unified GUI**:
   ```bash
   python biometric_system_gui.py
   ```

4. **Connect device and start using!**

---

**🎯 The Unified Biometric System GUI provides a complete solution for fingerprint-based employee management and attendance tracking in a single, easy-to-use application.**
