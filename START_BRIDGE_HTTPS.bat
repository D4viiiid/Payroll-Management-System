@echo off
echo ========================================
echo START FINGERPRINT BRIDGE WITH HTTPS
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

echo Step 1: Kill any existing node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 3 /nobreak >nul
echo.

echo Step 2: Navigate to fingerprint-bridge directory...
cd /d "C:\Users\Ludwig Rivera\Downloads\Attendance-and-Payroll-Management-System\employee\fingerprint-bridge"
echo Current directory: %CD%
echo.

echo Step 3: Verify SSL certificates exist...
if not exist "cert.pem" (
    echo ERROR: cert.pem not found!
    echo Run: node generate-certificate.js
    pause
    exit /b 1
)
if not exist "key.pem" (
    echo ERROR: key.pem not found!
    echo Run: node generate-certificate.js
    pause
    exit /b 1
)
echo ✅ SSL certificates found!
echo.

echo Step 4: Starting bridge service with HTTPS...
echo (Service will run with FIXED Python path + HTTPS + MONGODB CONNECTION)
echo (Keep this window open!)
echo.
echo ========================================
echo.

node bridge.js

pause