@echo off
REM ============================================================================
REM RESTART FINGERPRINT BRIDGE SERVICE
REM Run this as Administrator after fixing Python dependencies
REM ============================================================================

echo.
echo ========================================================================
echo          RESTART FINGERPRINT BRIDGE SERVICE
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

echo Stopping Fingerprint Bridge Service...
net stop FingerprintBridgeService
timeout /t 3 /nobreak >nul

echo.
echo Starting Fingerprint Bridge Service...
net start FingerprintBridgeService

echo.
echo ========================================================================
echo Service restarted successfully!
echo.
echo Testing device detection...
timeout /t 2 /nobreak >nul

echo.
echo Opening health check in browser...
start https://localhost:3003/api/health

echo.
echo ========================================================================
echo.
echo Next steps:
echo   1. Browser will open health check (accept certificate warning)
echo   2. Refresh Vercel dashboard: https://employee-frontend-eight-rust.vercel.app/dashboard
echo   3. Check "USB Scanner" status - should show "✅ Detected"
echo.
echo ========================================================================
pause
