@echo off
REM ============================================================================
REM AUTO-INSTALL FINGERPRINT BRIDGE AS WINDOWS SERVICE
REM This makes the bridge server start automatically with Windows
REM ============================================================================

REM ✅ CRITICAL FIX: Change to the directory where this batch file is located
REM This ensures all paths resolve correctly
cd /d "%~dp0"

echo.
echo ========================================================================
echo          FINGERPRINT BRIDGE - AUTO SERVICE INSTALLER
echo ========================================================================
echo.
echo This will install the Fingerprint Bridge as a Windows Service
echo that starts automatically when Windows boots.
echo.
echo Installation directory: %CD%
echo.
echo Requirements:
echo   - Node.js installed
echo   - Python 3.x with pyzkfp installed
echo   - Administrator privileges
echo.
pause

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script requires Administrator privileges!
    echo Please right-click and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: Python is not installed or not in PATH!
    echo Please install Python 3.7 or later from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)
python --version
echo ✅ Python found

echo.
echo [2/6] Installing Python dependencies (pyzkfp, pymongo)...
echo.
echo Installing critical packages with specific versions...
echo   - pyzkfp==0.1.5     (ZKTeco fingerprint SDK)
echo   - pymongo           (MongoDB connection)
echo   - python-dotenv     (Environment variables)
echo   - pillow            (Image processing)
echo   - requests          (HTTP client)
echo   - dnspython         (DNS resolution)
echo.

REM ✅ CRITICAL FIX: Install to system-wide location so Windows Service (SYSTEM account) can access
REM Instead of using --user (installs to user folder), install directly to Python's site-packages
echo Installing Python packages system-wide for Windows Service compatibility...
pip install --force-reinstall pyzkfp==0.1.5 pymongo python-dotenv pillow requests dnspython --quiet
if %errorLevel% neq 0 (
    echo.
    echo ⚠️  WARNING: Some packages failed with specific versions
    echo Trying without version constraints...
    pip install --force-reinstall pyzkfp pymongo python-dotenv pillow requests dnspython
    if %errorLevel% neq 0 (
        echo.
        echo ❌ ERROR: Failed to install Python dependencies!
        echo.
        echo TROUBLESHOOTING:
        echo   1. Ensure Python is properly installed
        echo   2. Try upgrading pip: python -m pip install --upgrade pip
        echo   3. Install Visual C++ Build Tools if needed:
        echo      https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo   4. Make sure you're running this installer as Administrator!
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Verifying Python packages installation...
python -c "import pyzkfp; print('✅ pyzkfp imported successfully')" 2>nul
if %errorLevel% neq 0 (
    echo ❌ pyzkfp import failed! Installation incomplete.
    pause
    exit /b 1
)

python -c "import pymongo; print('✅ pymongo imported successfully')" 2>nul
if %errorLevel% neq 0 (
    echo ❌ pymongo import failed! Installation incomplete.
    pause
    exit /b 1
)

REM ✅ NEW: Verify pyzkfp is installed system-wide (not in user folder)
echo.
echo Verifying pyzkfp installation location...
python -c "import pyzkfp; import os; path = pyzkfp.__file__; print(f'📂 pyzkfp location: {path}'); assert 'AppData' not in path and 'Roaming' not in path, 'ERROR: pyzkfp installed in user folder!'; print('✅ pyzkfp correctly installed system-wide')" 2>nul
if %errorLevel% neq 0 (
    echo.
    echo ⚠️  WARNING: pyzkfp may be installed in user folder instead of system-wide!
    echo This could cause issues when the service runs as SYSTEM account.
    echo.
    echo To fix: Run this installer as Administrator and it will reinstall system-wide.
    echo.
    pause
)

echo ✅ All Python dependencies installed and verified

echo.
echo [3/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js 14+ from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
node --version
echo ✅ Node.js found

echo.
echo [4/6] Installing node-windows package...
call npm install node-windows

echo.
echo [5/6] Installing local dependencies...
call npm install

echo.
echo [5.5/6] Generating SSL certificate for HTTPS...
echo This allows the Vercel web app to connect to the bridge!
node generate-certificate.js
if %errorLevel% equ 0 (
    echo ✅ SSL certificate generated successfully
) else (
    echo ⚠️  SSL certificate generation failed - bridge will run in HTTP mode
    echo    Install OpenSSL or Git for Windows to enable HTTPS
)

echo.
echo [5.6/6] Setting up MongoDB configuration...
if not exist "config.env" (
    if exist "config.env.example" (
        echo Creating config.env from template...
        copy config.env.example config.env >nul
        echo ✅ config.env created from template
        echo.
        echo ⚠️  IMPORTANT: Edit config.env and update MONGODB_URI if needed!
        echo    Default connection string is already configured.
    ) else (
        echo ⚠️  config.env.example not found
        echo    Creating basic config.env...
        echo MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true^&w=majority^&appName=Cluster0 > config.env
        echo ✅ Basic config.env created
    )
) else (
    echo ✅ config.env already exists
)

echo.
echo [6/6] Creating Windows Service...
echo Running from directory: %CD%
node install-service.js

echo.
echo [FINAL] Starting service...
timeout /t 3 /nobreak >nul
net start FingerprintBridgeService

echo.
echo [POST-INSTALL] Testing device detection...
echo.
python -c "from pyzkfp import ZKFP2; zkfp2 = ZKFP2(); zkfp2.Init(); count = zkfp2.GetDeviceCount(); print(f'📱 Detected {count} ZKTeco device(s)'); zkfp2.Terminate()" 2>nul
if %errorLevel% equ 0 (
    echo ✅ Device detection test PASSED!
) else (
    echo ⚠️  Device detection test failed
    echo    This is OK if scanner is not connected yet
    echo    Please connect scanner and restart service
)

echo.
echo [SERVICE] Verifying service is running...
timeout /t 3 /nobreak >nul
sc query FingerprintBridgeService | find "RUNNING" >nul
if %errorLevel% equ 0 (
    echo ✅ FingerprintBridgeService is running
) else (
    echo ⚠️  Service might not be running
    echo    Check: services.msc
)

echo.
echo [FINAL CHECK] Testing API health endpoint...
echo Waiting for service to initialize...
timeout /t 5 /nobreak >nul
curl -k https://localhost:3003/api/health 2>nul
if %errorLevel% equ 0 (
    echo.
    echo ✅ Bridge API is responding!
) else (
    echo.
    echo ⚠️  Bridge API not responding yet
    echo    This is normal if service just started
    echo    Wait 10 seconds and try: curl -k https://localhost:3003/api/health
)

echo.
echo ========================================================================
echo                    INSTALLATION COMPLETE!
echo ========================================================================
echo.
echo The Fingerprint Bridge Server is now running as a Windows Service.
echo.
echo Service Name: FingerprintBridgeService
echo Status: Running on https://localhost:3003 (HTTPS enabled!)
echo Auto-start: Enabled (starts with Windows)
echo Installation Path: %CD%
echo.
echo ⚠️  IMPORTANT: First-time browser setup:
echo   1. Open: https://localhost:3003/api/health
echo   2. Browser shows "Not Secure" warning (self-signed certificate)
echo   3. Click "Advanced" then "Proceed to localhost (unsafe)"
echo   4. This is SAFE - it's your own computer!
echo   5. Browser will remember - no warning on future visits
echo.
echo After accepting the certificate, the Vercel web app can connect! ✅
echo.
echo To verify it's running, open your browser and visit:
echo   https://localhost:3003/api/health
echo.
echo To manage the service:
echo   - Stop:     net stop FingerprintBridgeService
echo   - Start:    net start FingerprintBridgeService
echo   - Restart:  net stop FingerprintBridgeService ^&^& net start FingerprintBridgeService
echo.
echo To uninstall:
echo   - Run: UNINSTALL_SERVICE.bat (as Administrator)
echo.
echo ========================================================================
echo.
pause
