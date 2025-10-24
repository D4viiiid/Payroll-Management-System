@echo off
echo ========================================
echo RESTARTING FINGERPRINT BRIDGE SERVICE
echo ========================================
echo.
echo This will apply the updated bridge.js with Python path fix
echo.

echo [1/2] Stopping service...
net stop fingerprintbridgeservice.exe
if errorlevel 1 (
    echo ❌ Failed to stop service
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [2/2] Starting service...
net start fingerprintbridgeservice.exe
if errorlevel 1 (
    echo ❌ Failed to start service
    pause
    exit /b 1
)

echo.
echo ✅ Service restarted successfully!
echo.
echo [VERIFICATION] Checking device status...
timeout /t 3 /nobreak >nul

curl -k https://localhost:3003/api/health

echo.
echo ========================================
echo RESTART COMPLETE
echo ========================================
echo.
pause
