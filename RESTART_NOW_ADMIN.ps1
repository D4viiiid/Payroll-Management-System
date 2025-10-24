# Request Administrator Privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Now running as Administrator
Write-Host "`n════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 RESTARTING FINGERPRINT BRIDGE SERVICE" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "[1/5] Stopping service..." -ForegroundColor Cyan
try {
    Stop-Service -Name "FingerprintBridgeService" -Force -ErrorAction Stop
    Write-Host "  ✅ Service stopped successfully`n" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: $_`n" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "[2/5] Waiting 3 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Write-Host "  ✅ Wait complete`n" -ForegroundColor Green

Write-Host "[3/5] Starting service..." -ForegroundColor Cyan
try {
    Start-Service -Name "FingerprintBridgeService" -ErrorAction Stop
    Write-Host "  ✅ Service started successfully`n" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: $_`n" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "[4/5] Waiting 8 seconds for initialization..." -ForegroundColor Cyan
for ($i = 8; $i -gt 0; $i--) {
    Write-Host "  $i..." -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 1
}
Write-Host " ✅ Ready`n" -ForegroundColor Green

Write-Host "[5/5] Testing API health endpoint..." -ForegroundColor Cyan
Write-Host "  URL: https://localhost:3003/api/health`n" -ForegroundColor White

try {
    $response = Invoke-RestMethod -Uri "https://localhost:3003/api/health" -SkipCertificateCheck -ErrorAction Stop
    
    Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  📊 API RESPONSE" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
    
    Write-Host "`n════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  🔍 ANALYSIS" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    # Compare timestamps
    $oldTimestamp = [DateTime]::Parse("2025-10-24T22:51:41.053Z").ToUniversalTime()
    $currentTimestamp = [DateTime]::Parse($response.lastCheck).ToUniversalTime()
    $now = [DateTime]::UtcNow
    
    Write-Host "Old timestamp (before restart):" -ForegroundColor White
    Write-Host "  $oldTimestamp UTC" -ForegroundColor Gray
    Write-Host "  (Yesterday, Oct 24 at 10:51 PM)`n" -ForegroundColor Gray
    
    Write-Host "New timestamp (after restart):" -ForegroundColor White
    Write-Host "  $currentTimestamp UTC" -ForegroundColor $(if ($currentTimestamp -gt $oldTimestamp) {'Green'} else {'Red'})
    
    $age = ($now - $currentTimestamp).TotalSeconds
    Write-Host "  Age: $([Math]::Round($age)) seconds ago`n" -ForegroundColor $(if ($age -lt 60) {'Green'} else {'Yellow'})
    
    if ($currentTimestamp -gt $oldTimestamp) {
        Write-Host "✅✅✅ SUCCESS! TIMESTAMP UPDATED! ✅✅✅" -ForegroundColor Green
        Write-Host "   The service loaded the NEW code!`n" -ForegroundColor Green
    } else {
        Write-Host "❌ WARNING: Timestamp NOT updated!" -ForegroundColor Red
        Write-Host "   The service might still be running old code.`n" -ForegroundColor Red
    }
    
    Write-Host "Device Status:" -ForegroundColor White
    Write-Host "  deviceConnected: $($response.deviceConnected)" -ForegroundColor $(if ($response.deviceConnected) {'Green'} else {'Red'})
    Write-Host "  deviceStatus: $($response.deviceStatus)`n" -ForegroundColor $(if ($response.deviceStatus -eq 'connected') {'Green'} else {'Yellow'})
    
    if ($response.deviceConnected) {
        Write-Host "🎉🎉🎉 PERFECT! DEVICE IS DETECTED! 🎉🎉🎉`n" -ForegroundColor Green
        Write-Host "✅ Everything is working!" -ForegroundColor Green
        Write-Host "✅ Refresh your dashboard now!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Device not detected. Checking why...`n" -ForegroundColor Yellow
        
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Run: cd C:\fingerprint-bridge" -ForegroundColor White
        Write-Host "  2. Run: node bridge.js" -ForegroundColor White
        Write-Host "  3. Look for [DEVICE CHECK] error messages`n" -ForegroundColor White
    }
    
} catch {
    Write-Host "  ❌ ERROR: $_`n" -ForegroundColor Red
    Write-Host "  Service might not have started properly.`n" -ForegroundColor Yellow
}

Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📋 DONE!" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
