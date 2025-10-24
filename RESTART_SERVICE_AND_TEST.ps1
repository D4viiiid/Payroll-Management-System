# CRITICAL FIX: Service Restart Required
# =======================================
# 
# ROOT CAUSE IDENTIFIED:
# ----------------------
# Your installation completed successfully and the NEW code is installed at:
#   C:\fingerprint-bridge\bridge.js (modified: 10/25/2025 6:48:42 AM)
# 
# BUT the Windows Service is still running the OLD code from yesterday!
# 
# EVIDENCE:
# ---------
# - API returns lastCheck: "2025-10-24T22:51:41.053Z" (YESTERDAY 10:51 PM)
# - You just installed at: 10/25/2025 6:50 AM (TODAY)
# - File timestamp: 10/25/2025 6:48:42 AM (TODAY)
# - Service process (PID 12716) is running OLD code
# 
# SOLUTION:
# ---------
# Restart the Windows Service to load the new code!

Write-Host "`n════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 FINGERPRINT BRIDGE SERVICE RESTART TOOL" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "🔍 DIAGNOSIS:" -ForegroundColor Cyan
Write-Host "  ✅ New code installed: 10/25/2025 6:48 AM" -ForegroundColor Green
Write-Host "  ❌ Service running old code from: 10/24/2025 10:51 PM" -ForegroundColor Red
Write-Host "  ⚠️  Service needs restart to load new code!`n" -ForegroundColor Yellow

Write-Host "📊 CHECKING CURRENT STATE..." -ForegroundColor Cyan

# Check service status
$service = Get-Service -Name "FingerprintBridgeService" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "  Service Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') {'Green'} else {'Red'})
} else {
    Write-Host "  ❌ Service not found!" -ForegroundColor Red
    pause
    exit 1
}

# Check port 3003
$port3003 = netstat -ano | findstr ":3003" | Select-String "LISTENING"
if ($port3003) {
    $pid = ($port3003 -split '\s+')[-1]
    Write-Host "  Port 3003: In use by PID $pid" -ForegroundColor Yellow
} else {
    Write-Host "  Port 3003: Available" -ForegroundColor Green
}

# Check file timestamp
$bridgeFile = Get-Item "C:\fingerprint-bridge\bridge.js" -ErrorAction SilentlyContinue
if ($bridgeFile) {
    Write-Host "  bridge.js modified: $($bridgeFile.LastWriteTime)" -ForegroundColor Green
} else {
    Write-Host "  ❌ bridge.js not found!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "`n════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ⚠️  ADMIN PRIVILEGES REQUIRED" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "This script will:" -ForegroundColor White
Write-Host "  1. Stop FingerprintBridgeService" -ForegroundColor White
Write-Host "  2. Wait 3 seconds" -ForegroundColor White
Write-Host "  3. Start FingerprintBridgeService (loads NEW code)" -ForegroundColor White
Write-Host "  4. Test API health endpoint" -ForegroundColor White
Write-Host "  5. Show results`n" -ForegroundColor White

$continue = Read-Host "Continue? (Y/N)"
if ($continue -ne 'Y' -and $continue -ne 'y') {
    Write-Host "`n❌ Cancelled by user" -ForegroundColor Red
    pause
    exit 0
}

Write-Host "`n[1/5] Stopping service..." -ForegroundColor Cyan
try {
    Stop-Service -Name "FingerprintBridgeService" -Force -ErrorAction Stop
    Write-Host "  ✅ Service stopped" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: $_" -ForegroundColor Red
    Write-Host "`n⚠️  Make sure to run PowerShell as Administrator!" -ForegroundColor Yellow
    Write-Host "  Right-click PowerShell → Run as Administrator`n" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "`n[2/5] Waiting 3 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
Write-Host "  ✅ Wait complete" -ForegroundColor Green

Write-Host "`n[3/5] Starting service..." -ForegroundColor Cyan
try {
    Start-Service -Name "FingerprintBridgeService" -ErrorAction Stop
    Write-Host "  ✅ Service started" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: $_" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "`n[4/5] Waiting 8 seconds for initialization..." -ForegroundColor Cyan
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
    
    # Parse lastCheck timestamp
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
        Write-Host "✅ SUCCESS: Timestamp updated!" -ForegroundColor Green
        Write-Host "   The service loaded the NEW code!`n" -ForegroundColor Green
    } else {
        Write-Host "❌ WARNING: Timestamp NOT updated!" -ForegroundColor Red
        Write-Host "   The service might still be running old code.`n" -ForegroundColor Red
    }
    
    Write-Host "Device Status:" -ForegroundColor White
    Write-Host "  deviceConnected: $($response.deviceConnected)" -ForegroundColor $(if ($response.deviceConnected) {'Green'} else {'Red'})
    Write-Host "  deviceStatus: $($response.deviceStatus)`n" -ForegroundColor $(if ($response.deviceStatus -eq 'connected') {'Green'} else {'Yellow'})
    
    if ($response.deviceConnected) {
        Write-Host "🎉 PERFECT! Device is detected!`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Device not detected. Check diagnostic logs:`n" -ForegroundColor Yellow
        Write-Host "  1. Open Event Viewer (eventvwr.msc)" -ForegroundColor White
        Write-Host "  2. Windows Logs → Application" -ForegroundColor White
        Write-Host "  3. Look for [DEVICE CHECK] messages" -ForegroundColor White
        Write-Host "  4. Check for Python errors (stderr, exit codes)`n" -ForegroundColor White
        
        Write-Host "  OR run bridge.js manually to see logs:" -ForegroundColor White
        Write-Host "  cd C:\fingerprint-bridge" -ForegroundColor Gray
        Write-Host "  node bridge.js`n" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "  ❌ ERROR: $_" -ForegroundColor Red
    Write-Host "`n  Possible causes:" -ForegroundColor Yellow
    Write-Host "    - Service didn't start properly" -ForegroundColor White
    Write-Host "    - Port 3003 blocked by firewall" -ForegroundColor White
    Write-Host "    - SSL certificate issue`n" -ForegroundColor White
}

Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📋 NEXT STEPS" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "1. Refresh your dashboard:" -ForegroundColor White
Write-Host "   https://employee-frontend-eight-rust.vercel.app/dashboard`n" -ForegroundColor Gray

Write-Host "2. Check Fingerprint Scanner Status panel`n" -ForegroundColor White

Write-Host "3. If still not working, check logs:" -ForegroundColor White
Write-Host "   cd C:\fingerprint-bridge" -ForegroundColor Gray
Write-Host "   node bridge.js`n" -ForegroundColor Gray

Write-Host "════════════════════════════════════════════════`n" -ForegroundColor Cyan

pause
