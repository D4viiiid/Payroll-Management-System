@echo off
echo ========================================
echo  FIX: Install pyzkfp for SYSTEM Account
echo ========================================
echo.

echo This will install pyzkfp for the SYSTEM account
echo so the Windows Service can find it.
echo.

echo Installing pyzkfp system-wide...
C:\Python313\python.exe -m pip install --upgrade pyzkfp==0.1.5

echo.
echo ========================================
echo  INSTALLATION COMPLETE!
echo ========================================
echo.

echo Now restarting the service...
net stop FingerprintBridgeService
timeout /t 2 >nul
net start FingerprintBridgeService

echo.
echo Waiting 8 seconds for service to initialize...
timeout /t 8 >nul

echo.
echo Testing device detection...
curl -k https://localhost:3003/api/health

echo.
echo ========================================
echo  DONE!
echo ========================================
echo.
echo Check the output above for:
echo   "deviceConnected": true
echo.

pause
