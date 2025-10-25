@echo off
:: ===============================================================
:: RESTART FINGERPRINT BRIDGE WITH HTTPS
:: ===============================================================
:: Run this script AS ADMINISTRATOR to enable HTTPS support
:: ===============================================================

echo.
echo ============================================================
echo   RESTARTING FINGERPRINT BRIDGE WITH HTTPS SUPPORT
echo ============================================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ ERROR: This script requires administrator privileges!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking SSL certificates...
if not exist "employee\fingerprint-bridge\cert.pem" (
    echo ❌ ERROR: cert.pem not found!
    echo Run: node employee\fingerprint-bridge\generate-certificate.js
    pause
    exit /b 1
)
if not exist "employee\fingerprint-bridge\key.pem" (
    echo ❌ ERROR: key.pem not found!
    echo Run: node employee\fingerprint-bridge\generate-certificate.js
    pause
    exit /b 1
)
echo ✅ SSL certificates found

echo.
echo [2/5] Stopping Windows Service (if running)...
sc query FingerprintBridgeService >nul 2>&1
if %errorLevel% equ 0 (
    echo Found Windows Service, stopping...
    sc stop FingerprintBridgeService
    timeout /t 3 /nobreak >nul
) else (
    echo No Windows Service found (skipping)
)

echo.
echo [3/5] Killing all Node.js processes on port 3003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003 ^| findstr LISTENING') do (
    echo Killing process: %%a
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo [4/5] Verifying port 3003 is free...
netstat -ano | findstr :3003 | findstr LISTENING >nul 2>&1
if %errorLevel% equ 0 (
    echo ❌ ERROR: Port 3003 still in use!
    netstat -ano | findstr :3003
    pause
    exit /b 1
)
echo ✅ Port 3003 is available

echo.
echo [5/5] Starting Fingerprint Bridge with HTTPS...
cd employee\fingerprint-bridge
start "Fingerprint Bridge HTTPS" /MIN cmd /c "node bridge.js & pause"

echo.
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   ✅ BRIDGE SERVICE RESTARTED WITH HTTPS!
echo ============================================================
echo.
echo 📋 Next steps:
echo    1. Open browser: https://localhost:3003/api/health
echo    2. Accept the self-signed certificate warning
echo    3. Test fingerprint attendance in the dashboard
echo.
echo 🔗 Health Check: https://localhost:3003/api/health
echo 🔐 Running in HTTPS mode with SSL certificates
echo.
pause
