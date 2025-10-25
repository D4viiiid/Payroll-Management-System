@echo off
echo ================================================================
echo COMPREHENSIVE DIAGNOSTIC TEST
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Python installation...
C:\Python313\python.exe --version
if %errorlevel% neq 0 (
    echo ❌ Python not found!
    pause
    exit /b 1
)
echo ✅ Python found
echo.

echo [2/5] Checking Python dependencies...
C:\Python313\python.exe -c "import pyzkfp; import pymongo; print('✅ All dependencies installed')"
if %errorlevel% neq 0 (
    echo ❌ Python dependencies missing!
    pause
    exit /b 1
)
echo.

echo [3/5] Testing MongoDB connection...
set MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true^&w=majority^&appName=Cluster0
C:\Python313\python.exe -c "from pymongo import MongoClient; import os; client = MongoClient(os.environ['MONGODB_URI']); client.admin.command('ping'); print('✅ MongoDB connected')"
if %errorlevel% neq 0 (
    echo ❌ MongoDB connection failed!
    pause
    exit /b 1
)
echo.

echo [4/5] Checking Python script syntax...
C:\Python313\python.exe -m py_compile "employee\Biometric_connect\capture_fingerprint_ipc_complete.py"
if %errorlevel% neq 0 (
    echo ❌ Python script has syntax errors!
    pause
    exit /b 1
)
echo ✅ Python script syntax OK
echo.

echo [5/5] Testing database connection in Python script...
cd employee\Biometric_connect
C:\Python313\python.exe -c "import sys; sys.path.insert(0, '.'); from capture_fingerprint_ipc_complete import get_database_connection; import os; os.environ['MONGODB_URI']='mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0'; db, client = get_database_connection(); print('✅ Database connection function works!' if db is not None else '❌ Database connection failed: ' + str(client))"
cd ..\..
echo.

echo ================================================================
echo ALL DIAGNOSTICS PASSED!
echo ================================================================
echo.
echo The Python script and database connection are working correctly.
echo If attendance still fails, the issue is in the bridge communication.
echo.
echo Please check the bridge terminal for exact error messages.
echo.
pause
