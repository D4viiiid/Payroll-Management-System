@echo off
echo ================================================================
echo RESTART FINGERPRINT BRIDGE WITH ALL FIXES
echo ================================================================
echo.
echo This script will:
echo  [1] Kill any running Node.js processes
echo  [2] Navigate to fingerprint-bridge directory
echo  [3] Start bridge server with improved error handling
echo.
echo FIXES INCLUDED:
echo  ✅ Health endpoint won't crash (cached device status)
echo  ✅ Attendance recording has detailed error logging
echo  ✅ Enrollment has device validation before attempting
echo  ✅ Python script timeouts prevent hanging
echo  ✅ Better error messages show root cause
echo.
pause
echo.

echo [1/3] Killing any existing Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Stopped existing Node.js process
) else (
    echo ℹ️  No Node.js process was running
)
timeout /t 2 /nobreak >nul
echo.

echo [2/3] Navigating to fingerprint-bridge directory...
cd /d "C:\Users\Ludwig Rivera\Downloads\Attendance-and-Payroll-Management-System\employee\fingerprint-bridge"
echo Current directory: %CD%
echo.

echo [3/3] Starting Fingerprint Bridge Server...
echo.
echo ================================================================
echo 🔐 FINGERPRINT BRIDGE SERVER - STARTING
echo ================================================================
echo.
echo ⚠️  KEEP THIS WINDOW OPEN while using fingerprint features!
echo.
echo Features:
echo  • HTTPS enabled (works with Vercel)
echo  • MongoDB connection configured
echo  • Python path: C:\Python313\python.exe
echo  • Device auto-detection enabled
echo  • Timeout protection (60 seconds)
echo.
echo Endpoints:
echo  GET  /api/health              - Health check
echo  POST /api/attendance/record   - Record attendance
echo  POST /api/fingerprint/enroll  - Enroll fingerprint
echo.
echo ================================================================
echo.

node bridge.js

echo.
echo.
echo ================================================================
echo SERVER STOPPED
echo ================================================================
pause
