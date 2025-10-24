@echo off
echo ========================================
echo  RESTARTING FINGERPRINT BRIDGE SERVICE
echo ========================================
echo.

echo [1/3] Stopping service...
net stop FingerprintBridgeService
if %errorlevel% neq 0 (
    echo ERROR: Failed to stop service. Make sure to run as Administrator!
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo.
echo [3/3] Starting service with NEW code...
net start FingerprintBridgeService
if %errorlevel% neq 0 (
    echo ERROR: Failed to start service!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  SERVICE RESTARTED SUCCESSFULLY!
echo ========================================
echo.
echo The service is now running with the latest code that includes:
echo   - Diagnostic logging ([DEVICE CHECK] messages)
echo   - Timestamp updates on ALL code paths
echo   - Enhanced error handling
echo.
echo NEXT STEPS:
echo   1. Wait 5 seconds for service to initialize
echo   2. Open: https://localhost:3003/api/health
echo   3. Look for a NEW timestamp in lastCheck
echo   4. Refresh your dashboard
echo.

echo Waiting 5 seconds for service initialization...
timeout /t 5 /nobreak

echo.
echo Testing API health endpoint...
curl -k https://localhost:3003/api/health
echo.
echo.

echo ========================================
echo  CHECK THE RESPONSE ABOVE
echo ========================================
echo.
echo You should see:
echo   - lastCheck with a NEW timestamp (just now, not yesterday!)
echo   - [DEVICE CHECK] logs in Windows Event Viewer
echo.
echo If lastCheck is still old:
echo   1. Check services.msc - verify service is running
echo   2. Check if another node.exe process is running on port 3003
echo   3. Kill any old node.exe processes and restart service again
echo.
echo If deviceConnected is still false:
echo   - Check Windows Event Viewer for [DEVICE CHECK] error logs
echo   - Look for Python stderr or exit code errors
echo   - Verify device is plugged in and working in Device Manager
echo.

pause
