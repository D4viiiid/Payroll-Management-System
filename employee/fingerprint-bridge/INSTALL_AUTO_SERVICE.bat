@echo off
REM ============================================================================
REM AUTO-INSTALL FINGERPRINT BRIDGE AS WINDOWS SERVICE
REM This makes the bridge server start automatically with Windows
REM ============================================================================

echo.
echo ========================================================================
echo          FINGERPRINT BRIDGE - AUTO SERVICE INSTALLER
echo ========================================================================
echo.
echo This will install the Fingerprint Bridge as a Windows Service
echo that starts automatically when Windows boots.
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
echo [1/4] Installing node-windows package...
call npm install -g node-windows

echo.
echo [2/4] Installing local dependencies...
call npm install

echo.
echo [3/4] Creating Windows Service...
node install-service.js

echo.
echo [4/4] Starting service...
net start FingerprintBridgeService

echo.
echo ========================================================================
echo                    INSTALLATION COMPLETE!
echo ========================================================================
echo.
echo The Fingerprint Bridge Server is now running as a Windows Service.
echo.
echo Service Name: FingerprintBridgeService
echo Status: Running on http://localhost:3003
echo Auto-start: Enabled (starts with Windows)
echo.
echo To manage the service:
echo   - Stop:     net stop FingerprintBridgeService
echo   - Start:    net start FingerprintBridgeService
echo   - Restart:  net stop FingerprintBridgeService ^&^& net start FingerprintBridgeService
echo.
echo To uninstall:
echo   - Run: UNINSTALL_SERVICE.bat
echo.
echo ========================================================================
echo.
pause
