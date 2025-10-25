@echo off
:: ===============================================================
:: STOP FINGERPRINT BRIDGE SERVICE (ADMIN REQUIRED)
:: ===============================================================

echo.
echo ============================================================
echo   STOPPING FINGERPRINT BRIDGE SERVICE
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

echo [1/2] Stopping Windows Service (if exists)...
sc query FingerprintBridgeService >nul 2>&1
if %errorLevel% equ 0 (
    echo Found Windows Service, stopping...
    sc stop FingerprintBridgeService
    timeout /t 3 /nobreak >nul
    echo ✅ Service stopped
) else (
    echo ℹ️  No Windows Service found (skipping)
)

echo.
echo [2/2] Killing all Node.js processes on port 3003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003 ^| findstr LISTENING') do (
    echo Killing process: %%a
    taskkill /F /PID %%a
)

echo.
echo Waiting for processes to terminate...
timeout /t 3 /nobreak >nul

echo.
netstat -ano | findstr :3003 | findstr LISTENING >nul 2>&1
if %errorLevel% equ 0 (
    echo ❌ WARNING: Port 3003 still in use!
    netstat -ano | findstr :3003
) else (
    echo ✅ Port 3003 is now available
)

echo.
echo ============================================================
echo   ✅ BRIDGE SERVICE STOPPED
echo ============================================================
echo.
echo Next: Run START_BRIDGE_HTTPS.bat (as admin) to restart with HTTPS
echo.
pause
