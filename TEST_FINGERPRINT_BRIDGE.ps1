# 🧪 FINGERPRINT BRIDGE - AUTOMATED TEST SCRIPT

# This script will verify all components are working correctly
# Run this AFTER installing the new fingerprint bridge

Write-Host "`n═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🧪 FINGERPRINT BRIDGE - AUTOMATED VERIFICATION TEST" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0
$warnings = 0

# TEST 1: Check if Python is installed
Write-Host "`n[TEST 1/10] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+)\.(\d+)\.(\d+)") {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        if ($major -ge 3 -and $minor -ge 7) {
            Write-Host "✅ PASS: $pythonVersion" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "❌ FAIL: Python version too old. Need 3.7+, found $pythonVersion" -ForegroundColor Red
            $testsFailed++
        }
    } else {
        Write-Host "❌ FAIL: Could not determine Python version" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "❌ FAIL: Python not found in PATH" -ForegroundColor Red
    Write-Host "   Download: https://www.python.org/downloads/" -ForegroundColor Yellow
    $testsFailed++
}

# TEST 2: Check if pyzkfp is installed
Write-Host "`n[TEST 2/10] Checking pyzkfp library..." -ForegroundColor Yellow
try {
    $pyzkfpCheck = python -c "import pyzkfp; print('OK')" 2>&1
    if ($pyzkfpCheck -match "OK") {
        Write-Host "✅ PASS: pyzkfp library found" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL: pyzkfp not installed" -ForegroundColor Red
        Write-Host "   Run: pip install pyzkfp" -ForegroundColor Yellow
        $testsFailed++
    }
} catch {
    Write-Host "❌ FAIL: Cannot check pyzkfp" -ForegroundColor Red
    $testsFailed++
}

# TEST 3: Check if Node.js is installed
Write-Host "`n[TEST 3/10] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v(\d+)\.(\d+)\.(\d+)") {
        $major = [int]$matches[1]
        if ($major -ge 14) {
            Write-Host "✅ PASS: Node.js $nodeVersion" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "❌ FAIL: Node.js version too old. Need 14+, found $nodeVersion" -ForegroundColor Red
            $testsFailed++
        }
    } else {
        Write-Host "❌ FAIL: Could not determine Node.js version" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "❌ FAIL: Node.js not found in PATH" -ForegroundColor Red
    Write-Host "   Download: https://nodejs.org" -ForegroundColor Yellow
    $testsFailed++
}

# TEST 4: Check if bridge service exists
Write-Host "`n[TEST 4/10] Checking Windows Service..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name "FingerprintBridgeService" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Write-Host "✅ PASS: Service installed and running" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "⚠️  WARNING: Service installed but not running (Status: $($service.Status))" -ForegroundColor Yellow
            Write-Host "   Run: net start FingerprintBridgeService" -ForegroundColor Yellow
            $warnings++
            $testsPassed++
        }
    } else {
        Write-Host "❌ FAIL: Service not installed" -ForegroundColor Red
        Write-Host "   Run: INSTALL_AUTO_SERVICE.bat (as Administrator)" -ForegroundColor Yellow
        $testsFailed++
    }
} catch {
    Write-Host "❌ FAIL: Cannot query service" -ForegroundColor Red
    $testsFailed++
}

# TEST 5: Check if bridge is accessible
Write-Host "`n[TEST 5/10] Checking bridge server accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.success -eq $true) {
        Write-Host "✅ PASS: Bridge server responding on localhost:3003" -ForegroundColor Green
        Write-Host "   Version: $($response.version)" -ForegroundColor Gray
        $testsPassed++
    } else {
        Write-Host "❌ FAIL: Bridge server returned error" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "❌ FAIL: Cannot connect to http://localhost:3003/api/health" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $testsFailed++
}

# TEST 6: Check if Python scripts are found
Write-Host "`n[TEST 6/10] Checking Python scripts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.scriptsFound -eq $true) {
        Write-Host "✅ PASS: Python scripts found by bridge" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL: Python scripts not found (scriptsFound: false)" -ForegroundColor Red
        Write-Host "   Bridge cannot find Biometric_connect/ folder" -ForegroundColor Yellow
        Write-Host "   Re-download installer (29.50 KB) and reinstall" -ForegroundColor Yellow
        $testsFailed++
    }
} catch {
    Write-Host "⚠️  SKIP: Cannot check (bridge not responding)" -ForegroundColor Yellow
    $warnings++
}

# TEST 7: Check if device is connected
Write-Host "`n[TEST 7/10] Checking USB scanner device..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.deviceConnected -eq $true) {
        Write-Host "✅ PASS: ZKTeco device detected" -ForegroundColor Green
        Write-Host "   Status: $($response.deviceStatus)" -ForegroundColor Gray
        $testsPassed++
    } else {
        Write-Host "⚠️  WARNING: Device not connected (deviceConnected: false)" -ForegroundColor Yellow
        Write-Host "   1. Check USB cable is plugged in" -ForegroundColor Yellow
        Write-Host "   2. Check Device Manager for SLK20R" -ForegroundColor Yellow
        Write-Host "   3. Test: python -c 'from pyzkfp import ZKFP2; zkfp2=ZKFP2(); zkfp2.Init(); print(zkfp2.GetDeviceCount())'" -ForegroundColor Yellow
        $warnings++
        $testsPassed++
    }
} catch {
    Write-Host "⚠️  SKIP: Cannot check (bridge not responding)" -ForegroundColor Yellow
    $warnings++
}

# TEST 8: Check if installation directory is correct
Write-Host "`n[TEST 8/10] Checking installation directory..." -ForegroundColor Yellow
$bridgeDir = "C:\fingerprint-bridge"
if (Test-Path $bridgeDir) {
    $files = @(
        "bridge.js",
        "package.json",
        "install-service.js",
        "Biometric_connect\capture_fingerprint_ipc_complete.py",
        "Biometric_connect\main.py",
        "requirements.txt"
    )
    $missingFiles = @()
    foreach ($file in $files) {
        if (-not (Test-Path (Join-Path $bridgeDir $file))) {
            $missingFiles += $file
        }
    }
    if ($missingFiles.Count -eq 0) {
        Write-Host "✅ PASS: All required files present in $bridgeDir" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL: Missing files in installation directory:" -ForegroundColor Red
        foreach ($file in $missingFiles) {
            Write-Host "   ✗ $file" -ForegroundColor Yellow
        }
        Write-Host "   Re-download installer (29.50 KB) and reinstall" -ForegroundColor Yellow
        $testsFailed++
    }
} else {
    Write-Host "❌ FAIL: Installation directory not found: $bridgeDir" -ForegroundColor Red
    Write-Host "   Extract ZIP to C:\fingerprint-bridge" -ForegroundColor Yellow
    $testsFailed++
}

# TEST 9: Check if frontend is running locally
Write-Host "`n[TEST 9/10] Checking local frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 3 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS: Frontend running on http://localhost:5173" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "❌ FAIL: Frontend returned status $($response.StatusCode)" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "⚠️  WARNING: Frontend not running on localhost:5173" -ForegroundColor Yellow
    Write-Host "   Run: npm run dev" -ForegroundColor Yellow
    Write-Host "   (This is REQUIRED to access localhost:3003 from browser)" -ForegroundColor Yellow
    $warnings++
}

# TEST 10: Check Windows Firewall
Write-Host "`n[TEST 10/10] Checking Windows Firewall..." -ForegroundColor Yellow
try {
    $firewallRule = Get-NetFirewallRule | Where-Object {$_.DisplayName -match "Node.js" -or $_.DisplayName -match "Fingerprint"} | Select-Object -First 1
    if ($firewallRule) {
        Write-Host "✅ PASS: Firewall rule found" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "⚠️  WARNING: No specific firewall rule found" -ForegroundColor Yellow
        Write-Host "   If connection fails, allow Node.js in Windows Firewall" -ForegroundColor Yellow
        $warnings++
        $testsPassed++
    }
} catch {
    Write-Host "⚠️  SKIP: Cannot check firewall (requires admin)" -ForegroundColor Yellow
    $warnings++
}

# SUMMARY
Write-Host "`n═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests Passed:  " -NoNewline
Write-Host "$testsPassed/10" -ForegroundColor Green
Write-Host "Tests Failed:  " -NoNewline
if ($testsFailed -eq 0) {
    Write-Host "$testsFailed/10" -ForegroundColor Green
} else {
    Write-Host "$testsFailed/10" -ForegroundColor Red
}
Write-Host "Warnings:      " -NoNewline
if ($warnings -eq 0) {
    Write-Host "$warnings" -ForegroundColor Green
} else {
    Write-Host "$warnings" -ForegroundColor Yellow
}
Write-Host ""

if ($testsFailed -eq 0 -and $warnings -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! System is ready for use." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Open browser: http://localhost:5173" -ForegroundColor White
    Write-Host "2. Login to admin panel" -ForegroundColor White
    Write-Host "3. Check Dashboard → Fingerprint Scanner Status" -ForegroundColor White
    Write-Host "4. Test Fingerprint Attendance" -ForegroundColor White
    Write-Host "5. Test Employee Enrollment" -ForegroundColor White
} elseif ($testsFailed -eq 0) {
    Write-Host "⚠️  TESTS PASSED WITH WARNINGS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Review warnings above and fix if needed." -ForegroundColor Yellow
    Write-Host "System may still work, but optimal performance not guaranteed." -ForegroundColor Yellow
} else {
    Write-Host "❌ TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix the failed tests above before continuing." -ForegroundColor Red
    Write-Host "Review FINGERPRINT_QUICK_START_OCT25_2025.md for troubleshooting." -ForegroundColor Yellow
}

Write-Host "`n═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
