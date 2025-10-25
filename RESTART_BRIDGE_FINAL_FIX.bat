@echo off
echo ============================================
echo   RESTARTING BRIDGE WITH ALL 3 FIXES
echo ============================================
echo.
echo Bug #1: Database connection validation - FIXED
echo Bug #2: JSON parsing from stdout - FIXED  
echo Bug #3: pyzkfp DB matching API - FIXED (FINAL)
echo.
echo Latest commit: 81029fa0
echo.
echo IMPORTANT: Close any existing bridge windows first!
echo Press Ctrl+C in the old bridge terminal, then run this script.
echo.
pause

cd "C:\Users\Ludwig Rivera\Downloads\Attendance-and-Payroll-Management-System\employee\fingerprint-bridge"

echo.
echo Starting bridge with ALL FIXES...
echo.
node bridge.js

pause
