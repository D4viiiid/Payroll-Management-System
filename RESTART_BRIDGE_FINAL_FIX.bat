@echo off
echo ============================================
echo   RESTARTING BRIDGE WITH ALL 10 FIXES
echo ============================================
echo.
echo Bug #1: Database connection validation - FIXED
echo Bug #2: JSON parsing from stdout - FIXED
echo Bug #3: pyzkfp DB matching API - FIXED
echo Bug #4: fid=0 treated as valid match - FIXED
echo Bug #5: Invalid templates crash system - FIXED
echo Bug #6: JSON parsing with debug output - FIXED
echo Bug #7: firstName/lastName response - FIXED
echo Bug #8: Attendance schema mismatch - FIXED
echo Bug #9: Time In/Out toggle logic - FIXED
echo Bug #10: Bridge employee display - FIXED
echo.
echo Latest commit: 88421906
echo.
echo IMPORTANT: Close any existing bridge windows first!
echo Press Ctrl+C in the old bridge terminal, then run this script.
echo.
pause

cd "C:\Users\Ludwig Rivera\Downloads\Attendance-and-Payroll-Management-System\employee\fingerprint-bridge"

echo.
echo Starting bridge with ALL 10 FIXES...
echo.
node bridge.js

pause
