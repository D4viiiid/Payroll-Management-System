@echo off
REM ============================================================================
REM COMPREHENSIVE FINGERPRINT SYSTEM TEST & FIX
REM Tests Python dependencies, device detection, and restarts bridge service
REM ============================================================================

echo.
echo ========================================================================
echo     COMPREHENSIVE FINGERPRINT SYSTEM TEST ^& FIX
echo ========================================================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges!
    echo Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo [1/6] Testing Python installation...
python --version
if %errorLevel% neq 0 (
    echo ❌ Python not found!
    pause
    exit /b 1
)
echo ✅ Python installed
echo.

echo [2/6] Testing Python dependencies...
python test-python-dependencies.py
echo.
pause

echo [3/6] Testing device detection (Python direct)...
python -c "from pyzkfp import ZKFP2; zkfp2 = ZKFP2(); zkfp2.Init(); count = zkfp2.GetDeviceCount(); print(f'\n✅ Detected {count} ZKTeco device(s)'); zkfp2.Terminate()"
if %errorLevel% equ 0 (
    echo ✅ Device detection works!
) else (
    echo ❌ Device detection failed!
    echo Please check if ZKTeco scanner is connected via USB
    pause
    exit /b 1
)
echo.
pause

echo [4/6] Stopping Fingerprint Bridge Service...
net stop FingerprintBridgeService >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ Service stopped
echo.

echo [5/6] Starting Fingerprint Bridge Service...
net start FingerprintBridgeService
if %errorLevel% neq 0 (
    echo ❌ Failed to start service!
    pause
    exit /b 1
)
echo ✅ Service started
echo.

echo [6/6] Waiting for service to initialize...
timeout /t 5 /nobreak
echo.

echo ========================================================================
echo                    SYSTEM TEST COMPLETE!
echo ========================================================================
echo.
echo Service Status:
sc query FingerprintBridgeService | findstr "STATE"
echo.
echo ========================================================================
echo.
echo NEXT STEPS:
echo.
echo 1. Open browser: https://localhost:3003/api/health
echo    (Accept certificate warning if first time)
echo.
echo 2. You should see JSON with:
echo    - "success": true
echo    - "deviceConnected": true
echo    - "deviceStatus": "connected"
echo.
echo 3. Open Vercel dashboard:
echo    https://employee-frontend-eight-rust.vercel.app/dashboard
echo.
echo 4. Check "Fingerprint Scanner Status":
echo    - Bridge Software: ✅ Connected
echo    - USB Scanner: ✅ Detected  (should now show!)
echo.
echo 5. Test fingerprint attendance by clicking:
echo    "Fingerprint Attendance" button
echo.
echo ========================================================================
echo.
pause
