# ============================================================================
# ZKFinger SDK Installation Detection Script
# Returns exit code 0 if SDK is installed, 1 if not found
# ============================================================================

$sdkInstalled = $false
$detectionMethod = ""

Write-Host "======================================================================"
Write-Host "          ZKFinger SDK Installation Detection"
Write-Host "======================================================================"
Write-Host ""

# Method 1: Check for ZKTeco registry keys
Write-Host "[1/4] Checking Windows Registry for ZKTeco SDK..."
$registryPaths = @(
    "HKLM:\SOFTWARE\ZKTeco",
    "HKLM:\SOFTWARE\WOW6432Node\ZKTeco",
    "HKLM:\SOFTWARE\ZKSoftware",
    "HKLM:\SOFTWARE\WOW6432Node\ZKSoftware",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

foreach ($path in $registryPaths) {
    try {
        if (Test-Path $path) {
            $items = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
            foreach ($item in $items) {
                $displayName = (Get-ItemProperty -Path $item.PSPath -Name DisplayName -ErrorAction SilentlyContinue).DisplayName
                if ($displayName -like "*ZKFinger*" -or $displayName -like "*ZKTeco*") {
                    Write-Host "  ✅ Found: $displayName" -ForegroundColor Green
                    $sdkInstalled = $true
                    $detectionMethod = "Registry Key: $displayName"
                    break
                }
            }
        }
    } catch {
        # Silent continue
    }
}

if ($sdkInstalled) {
    Write-Host "  ✅ SDK detected in registry!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Not found in registry" -ForegroundColor Yellow
}

# Method 2: Check Program Files folders
Write-Host ""
Write-Host "[2/4] Checking Program Files directories..."
$programFilesPaths = @(
    "${env:ProgramFiles}\ZKTeco",
    "${env:ProgramFiles(x86)}\ZKTeco",
    "${env:ProgramFiles}\ZKSoftware",
    "${env:ProgramFiles(x86)}\ZKSoftware",
    "${env:ProgramFiles}\ZKFinger",
    "${env:ProgramFiles(x86)}\ZKFinger"
)

foreach ($path in $programFilesPaths) {
    if (Test-Path $path) {
        Write-Host "  ✅ Found: $path" -ForegroundColor Green
        $sdkInstalled = $true
        $detectionMethod = "Installation Folder: $path"
        break
    }
}

if ($sdkInstalled -and $detectionMethod -like "Installation Folder*") {
    Write-Host "  ✅ SDK folder detected!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No SDK folder found in Program Files" -ForegroundColor Yellow
}

# Method 3: Check for zkfp.dll in System32/SysWOW64
Write-Host ""
Write-Host "[3/4] Checking for ZKFinger DLL files..."
$dllPaths = @(
    "${env:SystemRoot}\System32\zkfp.dll",
    "${env:SystemRoot}\SysWOW64\zkfp.dll",
    "${env:SystemRoot}\System32\libzkfp.dll",
    "${env:SystemRoot}\SysWOW64\libzkfp.dll",
    "${env:SystemRoot}\System32\zkfpm.dll",
    "${env:SystemRoot}\SysWOW64\zkfpm.dll"
)

foreach ($dllPath in $dllPaths) {
    if (Test-Path $dllPath) {
        Write-Host "  ✅ Found: $dllPath" -ForegroundColor Green
        $sdkInstalled = $true
        $detectionMethod = "DLL File: $dllPath"
        break
    }
}

if ($sdkInstalled -and $detectionMethod -like "DLL File*") {
    Write-Host "  ✅ SDK DLL files detected!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No SDK DLL files found in System directories" -ForegroundColor Yellow
}

# Method 4: Try to load pyzkfp and test device detection
Write-Host ""
Write-Host "[4/4] Testing pyzkfp Python module device detection..."
try {
    $testResult = python -c @"
try:
    from pyzkfp import ZKFP2
    zkfp2 = ZKFP2()
    init_result = zkfp2.Init()
    if init_result == 0:
        print('SDK_INITIALIZED')
        zkfp2.Terminate()
    else:
        print('SDK_NOT_AVAILABLE')
except Exception as e:
    if 'Unable to locate' in str(e) or 'DLL load failed' in str(e) or 'cannot find' in str(e):
        print('SDK_NOT_INSTALLED')
    else:
        print('SDK_ERROR')
"@ 2>&1
    
    if ($testResult -like "*SDK_INITIALIZED*") {
        Write-Host "  ✅ pyzkfp successfully initialized SDK!" -ForegroundColor Green
        $sdkInstalled = $true
        $detectionMethod = "pyzkfp ZKFP2 initialization successful"
    } elseif ($testResult -like "*SDK_NOT_INSTALLED*") {
        Write-Host "  ⚠️  pyzkfp reports SDK DLLs not found" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  pyzkfp test inconclusive" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Unable to test pyzkfp (Python may not be installed)" -ForegroundColor Yellow
}

# Final Result
Write-Host ""
Write-Host "======================================================================"
Write-Host "                      Detection Results"
Write-Host "======================================================================"
Write-Host ""

if ($sdkInstalled) {
    Write-Host "✅ ZKFinger SDK is INSTALLED" -ForegroundColor Green
    Write-Host "   Detection Method: $detectionMethod" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   The ZKTeco Live20R SLK20R fingerprint scanner should work properly." -ForegroundColor Green
    Write-Host ""
    exit 0  # SDK found
} else {
    Write-Host "❌ ZKFinger SDK is NOT INSTALLED" -ForegroundColor Red
    Write-Host ""
    Write-Host "   The ZKTeco Live20R SLK20R fingerprint scanner will NOT work without the SDK." -ForegroundColor Yellow
    Write-Host "   The installer will now automatically install the ZKFinger SDK." -ForegroundColor Cyan
    Write-Host ""
    exit 1  # SDK not found
}
