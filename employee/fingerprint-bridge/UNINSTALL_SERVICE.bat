@echo off
REM ============================================================================
REM UNINSTALL FINGERPRINT BRIDGE WINDOWS SERVICE
REM ============================================================================

echo.
echo ========================================================================
echo        FINGERPRINT BRIDGE - SERVICE UNINSTALLER
echo ========================================================================
echo.
echo This will uninstall the Fingerprint Bridge Windows Service.
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
echo [1/2] Stopping service...
net stop FingerprintBridgeService

echo.
echo [2/2] Uninstalling service...
node uninstall-service.js

echo.
echo ========================================================================
echo                  UNINSTALLATION COMPLETE!
echo ========================================================================
echo.
echo The Fingerprint Bridge Service has been removed.
echo.
pause
