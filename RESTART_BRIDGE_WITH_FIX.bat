@echo off
echo ========================================
echo RESTART FINGERPRINT BRIDGE WITH FIX
echo ========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script requires Administrator privileges!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo Step 1: Kill all node.exe processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Step 2: Navigate to fingerprint-bridge directory...
cd /d "C:\Users\Ludwig Rivera\Downloads\Attendance-and-Payroll-Management-System\employee\fingerprint-bridge"
echo Current directory: %CD%
echo.

echo Step 3: Starting bridge service with FIXED code...
echo (This will run in the foreground - keep window open!)
echo.
node bridge.js
