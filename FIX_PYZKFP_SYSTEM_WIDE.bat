@echo off
echo ========================================
echo  CRITICAL FIX: Install pyzkfp System-Wide
echo ========================================
echo.

echo Current issue:
echo   pyzkfp is in: C:\Users\Ludwig Rivera\AppData\Roaming\...
echo   Windows Service runs as SYSTEM and can't access user folders!
echo.

echo Solution:
echo   Install pyzkfp to: C:\Python313\Lib\site-packages\
echo.

pause

echo Installing pyzkfp system-wide (NOT --user flag)...
echo.

C:\Python313\python.exe -m pip install --force-reinstall pyzkfp==0.1.5

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installation failed!
    echo Make sure you're running as Administrator!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  VERIFYING INSTALLATION
echo ========================================
echo.

C:\Python313\python.exe -c "import pyzkfp; print('pyzkfp location:', pyzkfp.__file__)"

echo.
echo If pyzkfp is now in C:\Python313\Lib\site-packages\, it will work!
echo.

pause

echo.
echo ========================================
echo  RESTARTING SERVICE
echo ========================================
echo.

net stop FingerprintBridgeService
timeout /t 2 >nul
net start FingerprintBridgeService

echo.
echo Waiting 10 seconds for service to initialize...
timeout /t 10 >nul

echo.
echo ========================================
echo  TESTING DEVICE DETECTION
echo ========================================
echo.

curl -k https://localhost:3003/api/health

echo.
echo.
echo ========================================
echo  CHECK THE OUTPUT ABOVE
echo ========================================
echo.
echo Look for: "deviceConnected": true
echo.

pause
