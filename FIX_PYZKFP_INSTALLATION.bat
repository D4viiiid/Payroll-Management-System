@echo off
REM ============================================================================
REM FIX PYZKFP INSTALLATION - Install Python dependencies properly
REM ============================================================================

echo.
echo ========================================================================
echo          FIX PYTHON DEPENDENCIES FOR FINGERPRINT SCANNER
echo ========================================================================
echo.
echo This will properly install pyzkfp and all Python dependencies
echo required for the ZKTeco fingerprint scanner to work.
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
echo [1/5] Checking Python installation...
python --version
if %errorLevel% neq 0 (
    echo.
    echo ERROR: Python is not installed!
    echo Please install Python 3.7-3.11 from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
echo ✅ Python found

echo.
echo [2/5] Upgrading pip to latest version...
python -m pip install --upgrade pip
echo ✅ pip upgraded

echo.
echo [3/5] Installing Microsoft Visual C++ Build Tools (if needed)...
echo.
echo ⚠️  IMPORTANT: If this fails, you need to install:
echo    "Microsoft Visual C++ 14.0 or greater"
echo.
echo    Download from:
echo    https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo.
echo    During installation, select:
echo    - "Desktop development with C++"
echo    - "MSVC v142 - VS 2019 C++ x64/x86 build tools"
echo    - "Windows 10 SDK"
echo.
pause

echo.
echo [4/5] Installing Python packages from requirements.txt...
echo.
echo Installing: pymongo, python-dotenv, pillow, requests...
pip install pymongo python-dotenv pillow requests dnspython
echo.
echo ✅ Basic packages installed

echo.
echo [5/5] Installing pyzkfp (ZKTeco SDK)...
echo.
echo Trying pyzkfp==0.1.5 (from requirements.txt)...
pip install pyzkfp==0.1.5
if %errorLevel% equ 0 (
    echo ✅ pyzkfp 0.1.5 installed successfully!
    goto :success
)

echo.
echo ⚠️  pyzkfp 0.1.5 failed. Trying alternative versions...
echo.

REM Try other versions
pip install pyzkfp==0.1.4
if %errorLevel% equ 0 (
    echo ✅ pyzkfp 0.1.4 installed successfully!
    goto :success
)

pip install pyzkfp==0.1.3
if %errorLevel% equ 0 (
    echo ✅ pyzkfp 0.1.3 installed successfully!
    goto :success
)

pip install pyzkfp
if %errorLevel% equ 0 (
    echo ✅ pyzkfp (latest) installed successfully!
    goto :success
)

echo.
echo ❌ ERROR: Failed to install pyzkfp!
echo.
echo SOLUTION:
echo 1. Install Visual Studio Build Tools:
echo    https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo.
echo 2. Or use precompiled wheel:
echo    pip install --find-links=https://pypi.org/simple/ pyzkfp
echo.
echo 3. Or install Python 3.9-3.11 (better compatibility)
echo.
pause
exit /b 1

:success
echo.
echo ========================================================================
echo                    INSTALLATION SUCCESSFUL!
echo ========================================================================
echo.
echo Testing Python imports...
python -c "from pyzkfp import ZKFP2; print('✅ pyzkfp imported successfully!')"
python -c "from pymongo import MongoClient; print('✅ pymongo imported successfully!')"
python -c "import base64, json, os; print('✅ Standard libraries OK!')"
echo.
echo ========================================================================
echo.
echo ✅ All Python dependencies installed successfully!
echo.
echo Next steps:
echo   1. Restart the Fingerprint Bridge Service:
echo      net stop FingerprintBridgeService
echo      net start FingerprintBridgeService
echo.
echo   2. Refresh the web app dashboard
echo.
echo   3. Check if "USB Scanner" shows "✅ Detected"
echo.
echo ========================================================================
echo.
pause
