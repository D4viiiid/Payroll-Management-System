@echo off
echo ================================================================
echo TEST PYTHON ATTENDANCE SCRIPT
echo ================================================================
echo.
echo This will test the Python attendance script with MongoDB
echo.

cd /d "%~dp0employee\Biometric_connect"

set MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true^&w=majority^&appName=Cluster0

echo Environment:
echo MONGODB_URI: %MONGODB_URI%
echo.
echo Testing database connection...
C:\Python313\python.exe capture_fingerprint_ipc_complete.py --direct

echo.
echo.
pause
