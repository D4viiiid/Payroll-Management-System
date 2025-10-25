@echo off
echo ========================================
echo COMPLETE FINGERPRINT SERVICE SETUP
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

echo Step 1: Navigate to fingerprint-bridge directory...
cd /d "C:\Users\Ludwig Rivera\Downloads\Attendance-and-Payroll-Management-System\employee\fingerprint-bridge"
echo Current directory: %CD%
echo.

echo Step 2: Check if service is already installed...
sc query FingerprintBridgeService >nul 2>&1
if %errorlevel% equ 0 (
    echo Service exists. Stopping and uninstalling...
    net stop FingerprintBridgeService 2>nul
    node uninstall-service.js
    timeout /t 2 /nobreak >nul
    echo.
)

echo Step 3: Running INSTALL_AUTO_SERVICE.bat...
echo.
call INSTALL_AUTO_SERVICE.bat
echo.

echo Step 4: Starting FingerprintBridgeService...
net start FingerprintBridgeService
echo.

if %errorlevel% equ 0 (
    echo ========================================
    echo ✅ SERVICE STARTED SUCCESSFULLY!
    echo ========================================
    echo.
    echo Step 5: Testing health endpoint...
    timeout /t 3 /nobreak >nul
    curl -k https://localhost:3003/api/health
    echo.
    echo.
    echo ========================================
    echo ✅ SETUP COMPLETE
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Refresh your browser (Ctrl+F5)
    echo 2. Go to Dashboard
    echo 3. Click "Fingerprint Attendance"
    echo 4. Test scanning your fingerprint
    echo.
) else (
    echo ========================================
    echo ❌ SERVICE FAILED TO START
    echo ========================================
    echo.
    echo Checking error logs...
    if exist "C:\fingerprint-bridge\daemon\fingerprintbridgeservice.err.log" (
        type "C:\fingerprint-bridge\daemon\fingerprintbridgeservice.err.log"
    ) else (
        echo No error log found.
    )
    echo.
)

pause
