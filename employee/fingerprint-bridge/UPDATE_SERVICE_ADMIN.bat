@echo off
echo ========================================
echo UPDATING FINGERPRINT BRIDGE SERVICE
echo ========================================
echo.
echo This will update the service with the Python path fix
echo.

echo [1/4] Stopping service...
net stop fingerprintbridgeservice.exe
if errorlevel 1 (
    echo ❌ Failed to stop service
    echo Make sure you run this as Administrator!
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [2/4] Backing up old bridge.js...
if exist "C:\fingerprint-bridge\bridge.js.backup" (
    del "C:\fingerprint-bridge\bridge.js.backup"
)
copy "C:\fingerprint-bridge\bridge.js" "C:\fingerprint-bridge\bridge.js.backup"

echo [3/4] Copying updated bridge.js...
copy /Y "%~dp0bridge.js" "C:\fingerprint-bridge\bridge.js"
if errorlevel 1 (
    echo ❌ Failed to copy bridge.js
    pause
    exit /b 1
)

echo [4/4] Starting service...
net start fingerprintbridgeservice.exe
if errorlevel 1 (
    echo ❌ Failed to start service
    pause
    exit /b 1
)

echo.
echo ✅ Service updated and restarted successfully!
echo.
echo [VERIFICATION] Checking device status in 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Calling API health check...
curl -k https://localhost:3003/api/health

echo.
echo.
echo ========================================
echo UPDATE COMPLETE
echo ========================================
echo.
echo Expected output: "deviceConnected": true
echo.
echo If device is still not detected, check the service logs:
echo   - Open Services (services.msc)
echo   - Right-click FingerprintBridgeService
echo   - Click Properties ^> Log On tab
echo.
pause
