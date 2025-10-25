@echo off
echo ========================================
echo Starting Fingerprint Bridge Service
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

echo Starting service...
net start FingerprintBridgeService

if %errorlevel% equ 0 (
    echo.
    echo ✅ Service started successfully!
    echo.
    echo Testing health endpoint...
    timeout /t 3 /nobreak >nul
    curl -k https://localhost:3003/api/health
    echo.
    echo.
    echo ========================================
    echo ✅ SERVICE IS NOW RUNNING
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Open your browser
    echo 2. Go to: https://employee-frontend-eight-rust.vercel.app/dashboard
    echo 3. Click "Fingerprint Attendance"
    echo 4. Test scanning your fingerprint
    echo.
) else (
    echo.
    echo ❌ Failed to start service!
    echo.
    echo Checking error logs...
    type "C:\fingerprint-bridge\daemon\fingerprintbridgeservice.err.log"
    echo.
)

pause
