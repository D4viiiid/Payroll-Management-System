@echo off
REM ================================================================
REM FINGERPRINT BRIDGE SERVER - START/RESTART SCRIPT
REM ================================================================
REM This script will:
REM  [1] Kill any running Node.js processes (prevents port conflicts)
REM  [2] Navigate to fingerprint-bridge directory
REM  [3] Verify dependencies and environment
REM  [4] Start bridge server with all fixes enabled
REM ================================================================

REM ✅ CRITICAL FIX: Change to the directory where this batch file is located
cd /d "%~dp0"

title Fingerprint Bridge Server - ZKTeco (Port 3003) - v2.1.0
color 0A

echo.
echo ================================================================
echo   FINGERPRINT BRIDGE SERVER v2.1.0
echo   ZKTeco Fingerprint Scanner USB Connection
echo ================================================================
echo.
echo FIXES INCLUDED:
echo  ✅ CLI-based fingerprint enrollment (no GUI blocking)
echo  ✅ Direct bridge service communication from cloud
echo  ✅ Health endpoint with cached device status
echo  ✅ Improved error handling and logging
echo  ✅ Auto-generated employee credentials
echo.
echo Starting from: %CD%
echo.

REM [1/5] Kill any existing Node.js processes to prevent conflicts
echo [1/5] Stopping any existing Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo       ✅ Stopped existing Node.js process
    timeout /t 2 /nobreak >nul
) else (
    echo       ℹ️  No Node.js process was running
)
echo.

REM [2/5] Check if node_modules exists
echo [2/5] Checking dependencies...
if not exist "node_modules\" (
    echo       ⚠️  Dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        echo.
        echo       ❌ Failed to install dependencies!
        echo       🔧 FIX: Please run: npm install
        pause
        exit /b 1
    )
    echo       ✅ Dependencies installed successfully
) else (
    echo       ✅ Dependencies found
)
echo.

REM [3/5] Check if Node.js is installed
echo [3/5] Verifying Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo       ❌ Node.js is not installed!
    echo       🔧 FIX: Download and install from: https://nodejs.org
    pause
    exit /b 1
)
echo       ✅ Node.js found: 
node --version
echo.

REM [4/5] Check if Python is installed
echo [4/5] Verifying Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo       ❌ Python is not installed!
    echo       🔧 FIX: Download and install from: https://python.org
    pause
    exit /b 1
)
echo       ✅ Python found:
python --version
echo.

REM [5/5] Verify Python scripts exist
echo [5/5] Verifying Python scripts...
if exist "Biometric_connect\capture_fingerprint_ipc_complete.py" (
    echo       ✅ Attendance script found
) else (
    echo       ⚠️  Attendance script not found
)
if exist "Biometric_connect\enroll_fingerprint_cli.py" (
    echo       ✅ Enrollment script found (CLI version)
) else (
    echo       ⚠️  Enrollment script not found
)
echo.

echo ================================================================
echo   🚀 STARTING BRIDGE SERVER
echo ================================================================
echo.
echo Server URL: https://localhost:3003 (HTTPS with self-signed cert)
echo Fallback:   http://localhost:3003  (HTTP)
echo.
echo ⚠️  KEEP THIS WINDOW OPEN while using fingerprint features!
echo.
echo Available Endpoints:
echo  GET  /api/health                 - Health check + device status
echo  POST /api/attendance/record      - Record attendance
echo  POST /api/fingerprint/enroll     - Enroll fingerprint (CLI)
echo  POST /api/fingerprint/login      - Login with fingerprint
echo  GET  /api/device/status          - Detailed device info
echo.
echo Features:
echo  • HTTPS enabled (works with Vercel production)
echo  • MongoDB connection configured
echo  • Python path: C:\Python313\python.exe
echo  • Device auto-detection enabled
echo  • Timeout protection (60 seconds)
echo  • CLI-based enrollment (no GUI blocking)
echo.
echo ================================================================
echo   SERVER RUNNING - Press Ctrl+C to stop
echo   Visit: https://localhost:3003/api/health to verify
echo ================================================================
echo.

REM Start the server
node bridge.js

REM If server exits, pause to show error
if errorlevel 1 (
    echo.
    echo ================================================================
    echo   ❌ SERVER EXITED WITH ERROR
    echo ================================================================
    echo.
    echo Common issues:
    echo  • Port 3003 already in use
    echo  • Missing dependencies (run: npm install)
    echo  • Python scripts not found
    echo  • MongoDB connection failed
    echo.
    pause
)
