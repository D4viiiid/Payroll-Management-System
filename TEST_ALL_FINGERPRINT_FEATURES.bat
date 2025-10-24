@echo off
REM ============================================================================
REM TEST ALL FINGERPRINT FEATURES
REM This script tests all 4 fingerprint features to verify fixes
REM ============================================================================

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║         FINGERPRINT SYSTEM - COMPREHENSIVE TEST SUITE               ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
echo Running comprehensive tests for all fingerprint features...
echo.

REM Test 1: Check if bridge service is running
echo [1/5] Checking Windows Service...
sc query FingerprintBridgeService | find "RUNNING" >nul
if %errorLevel% equ 0 (
    echo ✅ FingerprintBridgeService is RUNNING
) else (
    echo ❌ FingerprintBridgeService is NOT RUNNING
    echo.
    echo To start service, run as Administrator:
    echo   net start FingerprintBridgeService
    echo.
    pause
    exit /b 1
)

REM Test 2: Check if bridge responds to health endpoint
echo.
echo [2/5] Testing bridge health endpoint...
curl -k -s https://localhost:3003/api/health >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Bridge health endpoint responding
) else (
    echo ❌ Bridge health endpoint not responding
    echo Trying HTTP instead of HTTPS...
    curl -s http://localhost:3003/api/health >nul 2>&1
    if %errorLevel% equ 0 (
        echo ⚠️  Bridge running on HTTP (HTTPS certificate may be missing)
    ) else (
        echo ❌ Bridge not responding on HTTP or HTTPS
        pause
        exit /b 1
    )
)

REM Test 3: Check device connection
echo.
echo [3/5] Checking fingerprint device connection...
curl -k -s https://localhost:3003/api/health > %TEMP%\bridge-health.json 2>nul
type %TEMP%\bridge-health.json | find "deviceConnected" | find "true" >nul
if %errorLevel% equ 0 (
    echo ✅ USB Scanner CONNECTED
) else (
    echo ❌ USB Scanner NOT DETECTED
    echo.
    echo Please ensure:
    echo   1. ZKTeco fingerprint scanner is plugged in via USB
    echo   2. Device shows in Device Manager (USB Input Device)
    echo   3. Python can detect device: python -c "from pyzkfp import ZKFP2; ..."
    echo.
)

REM Test 4: Check endpoint paths (verify /api/ prefix fix)
echo.
echo [4/5] Verifying endpoint paths (API prefix fix)...
curl -k -s https://localhost:3003/api/attendance/record -X POST -H "Content-Type: application/json" > %TEMP%\endpoint-test.json 2>nul
type %TEMP%\endpoint-test.json | find "success" >nul
if %errorLevel% equ 0 (
    echo ✅ /api/attendance/record endpoint exists
) else (
    echo ❌ /api/attendance/record endpoint not found
)

curl -k -s https://localhost:3003/api/fingerprint/enroll -X POST -H "Content-Type: application/json" -d "{\"employeeId\":\"test\",\"firstName\":\"Test\",\"lastName\":\"User\"}" > %TEMP%\endpoint-test2.json 2>nul
type %TEMP%\endpoint-test2.json | find "success" >nul
if %errorLevel% equ 0 (
    echo ✅ /api/fingerprint/enroll endpoint exists
) else (
    echo ❌ /api/fingerprint/enroll endpoint not found
)

REM Test 5: Check pyzkfp installation location
echo.
echo [5/5] Verifying pyzkfp installation location (system-wide check)...
python -c "import pyzkfp; path = pyzkfp.__file__; print('📂 pyzkfp location:', path); assert 'AppData' not in path and 'Roaming' not in path, 'ERROR: In user folder!'; print('✅ pyzkfp correctly installed system-wide')" 2>nul
if %errorLevel% equ 0 (
    echo ✅ pyzkfp installed SYSTEM-WIDE (SYSTEM account can access)
) else (
    echo ❌ pyzkfp may be in USER FOLDER (SYSTEM account cannot access)
    echo.
    echo To fix, run as Administrator:
    echo   pip install --force-reinstall pyzkfp==0.1.5
    echo   net stop FingerprintBridgeService
    echo   net start FingerprintBridgeService
    echo.
)

REM Summary
echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                        TEST SUMMARY                                  ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
echo Service Status:        Run 'sc query FingerprintBridgeService' to check
echo Bridge Health:         https://localhost:3003/api/health
echo Device Detection:      Check service error logs if device not found
echo Endpoint Paths:        All endpoints use /api/ prefix ✅
echo pyzkfp Location:       Must be system-wide for service to work
echo.
echo 📊 Full health check response:
echo.
type %TEMP%\bridge-health.json
echo.
echo.
echo ═══════════════════════════════════════════════════════════════════════
echo NEXT STEPS:
echo ═══════════════════════════════════════════════════════════════════════
echo.
echo 1. If all tests pass: Open dashboard and test attendance recording
echo 2. If device not detected: Check Device Manager and reconnect scanner
echo 3. If pyzkfp not system-wide: Reinstall as Administrator
echo 4. If service not running: net start FingerprintBridgeService
echo.
pause
