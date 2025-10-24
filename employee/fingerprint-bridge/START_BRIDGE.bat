@echo off
REM ✅ CRITICAL FIX: Change to the directory where this batch file is located
cd /d "%~dp0"

title Fingerprint Bridge Server - ZKTeco (Port 3003)
color 0A

echo.
echo ====================================================================
echo   FINGERPRINT BRIDGE SERVER
echo   ZKTeco Fingerprint Scanner USB Connection
echo ====================================================================
echo.
echo [INFO] Starting server from: %CD%
echo [INFO] Make sure your fingerprint scanner is connected via USB
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [WARN] Dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo [FIX] Please run: npm install
        pause
        exit /b 1
    )
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed!
    echo [FIX] Download and install from: https://nodejs.org
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed!
    echo [FIX] Download and install from: https://python.org
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version
echo [OK] Python found:
python --version
echo.
echo [INFO] Starting bridge server on http://localhost:3003
echo.
echo ====================================================================
echo   SERVER RUNNING - Press Ctrl+C to stop
echo   Visit: http://localhost:3003/api/health to verify
echo ====================================================================
echo.

REM Start the server
node bridge.js

REM If server exits, pause to show error
if errorlevel 1 (
    echo.
    echo [ERROR] Server exited with error!
    pause
)
