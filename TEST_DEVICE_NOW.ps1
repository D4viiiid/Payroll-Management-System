# Test Device Detection
# This script triggers a device check via the API

Write-Host "`n════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔬 DEVICE DETECTION TEST" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Testing device detection via API...`n" -ForegroundColor White

# Call health endpoint multiple times to trigger fresh device check
for ($i = 1; $i -le 3; $i++) {
    Write-Host "Attempt $i/3..." -ForegroundColor Cyan
    $json = curl.exe -k https://localhost:3003/api/health 2>$null | ConvertFrom-Json
    
    Write-Host "  Device Connected: " -NoNewline
    Write-Host "$($json.deviceConnected)" -ForegroundColor $(if ($json.deviceConnected) {'Green'} else {'Red'})
    Write-Host "  Last Check: $($json.lastCheck)" -ForegroundColor Gray
    Write-Host ""
    
    if ($json.deviceConnected) {
        Write-Host "🎉 DEVICE DETECTED!`n" -ForegroundColor Green
        break
    }
    
    if ($i -lt 3) {
        Write-Host "  Waiting 3 seconds before retry...`n" -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $json.deviceConnected) {
    Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "⚠️  DEVICE NOT DETECTED" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════`n" -ForegroundColor Yellow
    
    Write-Host "Possible causes:" -ForegroundColor White
    Write-Host "  1. Device not plugged in" -ForegroundColor Gray
    Write-Host "  2. Device in use by another program" -ForegroundColor Gray
    Write-Host "  3. Python module (pyzkfp) issue" -ForegroundColor Gray
    Write-Host "  4. USB port issue`n" -ForegroundColor Gray
    
    Write-Host "Checking Device Manager...`n" -ForegroundColor Cyan
    
    # Check if device exists in system
    $devices = Get-PnpDevice | Where-Object { $_.FriendlyName -like "*SLK*" -or $_.FriendlyName -like "*ZKT*" -or $_.FriendlyName -like "*Live*" }
    
    if ($devices) {
        Write-Host "✅ Device found in Device Manager:" -ForegroundColor Green
        $devices | ForEach-Object {
            Write-Host "   $($_.FriendlyName) - Status: $($_.Status)" -ForegroundColor White
        }
        Write-Host ""
        
        if ($devices.Status -contains "OK") {
            Write-Host "Device hardware is OK. Checking Python...`n" -ForegroundColor Cyan
            
            # Test Python and pyzkfp
            Write-Host "Testing Python + pyzkfp module...`n" -ForegroundColor Cyan
            
            $pythonTest = & "C:\Python313\python.exe" -c "from pyzkfp import ZKFP2; zkfp2 = ZKFP2(); zkfp2.Init(); print(zkfp2.GetDeviceCount()); zkfp2.Terminate()" 2>&1
            
            Write-Host "Python output: $pythonTest`n" -ForegroundColor White
            
            if ($pythonTest -match "^\d+$") {
                $deviceCount = [int]$pythonTest
                if ($deviceCount -gt 0) {
                    Write-Host "✅ Python detects $deviceCount device(s)!" -ForegroundColor Green
                    Write-Host "⚠️  But bridge service doesn't detect it.`n" -ForegroundColor Yellow
                    
                    Write-Host "SOLUTION: Restart the bridge service:" -ForegroundColor Yellow
                    Write-Host "  Run as Admin: net stop FingerprintBridgeService" -ForegroundColor White
                    Write-Host "  Run as Admin: net start FingerprintBridgeService`n" -ForegroundColor White
                } else {
                    Write-Host "⚠️  Python sees 0 devices" -ForegroundColor Yellow
                    Write-Host "Device might be in use by another program`n" -ForegroundColor Yellow
                }
            } else {
                Write-Host "❌ Python error: $pythonTest`n" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Device status is not OK in Device Manager`n" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ No ZKTeco device found in Device Manager`n" -ForegroundColor Red
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "  1. Device is plugged into USB port" -ForegroundColor White
        Write-Host "  2. Device has power (LED should be on)" -ForegroundColor White
        Write-Host "  3. Try a different USB port`n" -ForegroundColor White
    }
}

Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
