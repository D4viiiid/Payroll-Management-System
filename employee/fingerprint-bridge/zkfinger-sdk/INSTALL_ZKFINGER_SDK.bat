@echo off
REM ============================================================================
REM ZKFinger SDK Silent Installation Script
REM Installs the ZKTeco ZKFinger SDK required for Live20R SLK20R scanner
REM ============================================================================

echo.
echo ========================================================================
echo          ZKFinger SDK Automatic Installation
echo ========================================================================
echo.
echo This will install the ZKTeco ZKFinger SDK 5.3.0.33
echo Required for: ZKTeco Live20R SLK20R Fingerprint Scanner
echo.
echo Installation Source: %~dp0setup.exe
echo.

REM Check if setup.exe exists
if not exist "%~dp0setup.exe" (
    echo.
    echo ❌ ERROR: setup.exe not found in %~dp0
    echo    Please ensure the SDK installer is present in the zkfinger-sdk folder.
    echo.
    exit /b 1
)

echo [INFO] SDK installer found: %~dp0setup.exe
echo [INFO] File size: 12.84 MB
echo.
echo [INFO] Attempting silent installation...
echo        This may take 1-2 minutes. Please wait...
echo.

REM ============================================================================
REM Try multiple silent installation methods
REM Different installers use different silent switches
REM ============================================================================

REM Method 1: Try /S (NSIS installers)
echo [ATTEMPT 1/5] Trying /S switch (NSIS)...
"%~dp0setup.exe" /S /D="%ProgramFiles(x86)%\ZKTeco\ZKFinger SDK"
timeout /t 5 /nobreak >nul

REM Check if installation succeeded
powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SDK_INSTALLATION.ps1" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Installation successful with /S switch!
    goto SUCCESS
)

REM Method 2: Try /SILENT (InstallShield)
echo [ATTEMPT 2/5] Trying /SILENT switch (InstallShield)...
"%~dp0setup.exe" /SILENT /DIR="%ProgramFiles(x86)%\ZKTeco\ZKFinger SDK"
timeout /t 5 /nobreak >nul

powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SDK_INSTALLATION.ps1" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Installation successful with /SILENT switch!
    goto SUCCESS
)

REM Method 3: Try /VERYSILENT (Inno Setup)
echo [ATTEMPT 3/5] Trying /VERYSILENT switch (Inno Setup)...
"%~dp0setup.exe" /VERYSILENT /DIR="%ProgramFiles(x86)%\ZKTeco\ZKFinger SDK"
timeout /t 5 /nobreak >nul

powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SDK_INSTALLATION.ps1" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Installation successful with /VERYSILENT switch!
    goto SUCCESS
)

REM Method 4: Try /quiet (MSI)
echo [ATTEMPT 4/5] Trying /quiet switch (MSI)...
"%~dp0setup.exe" /quiet /qn INSTALLDIR="%ProgramFiles(x86)%\ZKTeco\ZKFinger SDK"
timeout /t 5 /nobreak >nul

powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SDK_INSTALLATION.ps1" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Installation successful with /quiet switch!
    goto SUCCESS
)

REM Method 5: Interactive mode with user confirmation
echo [ATTEMPT 5/5] Silent installation failed - trying interactive mode...
echo.
echo ⚠️  IMPORTANT: Manual installation required
echo    The installer will now open in interactive mode.
echo    Please follow the on-screen instructions to install the ZKFinger SDK.
echo.
echo    TIPS:
echo      - Use default installation location
echo      - Complete all installation steps
echo      - Wait for "Installation Complete" message
echo      - Close the installer window when done
echo.
pause
echo.
echo Opening ZKFinger SDK installer...
start /wait "" "%~dp0setup.exe"

REM Final check after interactive installation
echo.
echo [INFO] Verifying installation...
powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SDK_INSTALLATION.ps1"
if %errorLevel% equ 0 (
    echo ✅ Installation verified successfully!
    goto SUCCESS
) else (
    echo ❌ Installation verification failed!
    echo.
    echo TROUBLESHOOTING:
    echo   1. Ensure you completed all installation steps
    echo   2. Reboot your computer and try again
    echo   3. Check Windows Event Viewer for errors
    echo   4. Contact system administrator if problem persists
    echo.
    goto FAILURE
)

:SUCCESS
echo.
echo ========================================================================
echo                    SDK Installation Successful!
echo ========================================================================
echo.
echo ✅ ZKFinger SDK has been installed successfully.
echo ✅ ZKTeco Live20R SLK20R fingerprint scanner is now ready to use.
echo.
echo    Continuing with fingerprint bridge installation...
echo.
exit /b 0

:FAILURE
echo.
echo ========================================================================
echo                    SDK Installation Failed!
echo ========================================================================
echo.
echo ❌ ZKFinger SDK installation could not be completed.
echo ❌ Fingerprint scanner will NOT work without the SDK.
echo.
echo NEXT STEPS:
echo   1. Download SDK manually from ZKTeco.com
echo   2. Install manually and rerun this installer
echo   3. Or contact technical support
echo.
exit /b 1
