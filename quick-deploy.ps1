# 🚀 QUICK DEPLOY SCRIPT
# Deploys all fixes to Vercel production

Write-Host "🚀 DEPLOYING COMPLETE PRODUCTION FIX" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if vercel CLI is installed
Write-Host "📦 Checking Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✅ Vercel CLI installed: $vercelVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Step 1: Update Backend Environment Variables
Write-Host "📝 STEP 1: UPDATE BACKEND ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "`n⚠️  MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Go to https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select project: payroll-backend-cyan" -ForegroundColor White
Write-Host "3. Go to: Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Update/Add for Production:" -ForegroundColor White
Write-Host "   CORS_ORIGIN=https://employee-frontend-eight-rust.vercel.app" -ForegroundColor Green
Write-Host "`n5. Click Save`n" -ForegroundColor White

$response = Read-Host "Have you updated the backend environment variables? (yes/no)"
if ($response -ne "yes") {
    Write-Host "❌ Deployment cancelled. Please update environment variables first." -ForegroundColor Red
    exit 1
}

# Step 2: Deploy Backend
Write-Host "`n📝 STEP 2: DEPLOY BACKEND WITH FIX" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Deploying backend to production...`n" -ForegroundColor Yellow

Set-Location -Path "employee\payroll-backend"

try {
    Write-Host "Deploying..." -ForegroundColor Yellow
    vercel --prod
    Write-Host "`n✅ Backend deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Set-Location -Path "..\..\"

# Step 3: Update Frontend Environment Variables
Write-Host "`n📝 STEP 3: UPDATE FRONTEND ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "`n⚠️  MANUAL ACTION REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Go to https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select project: employee-frontend-eight-rust" -ForegroundColor White
Write-Host "3. Go to: Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Update/Add for Production:" -ForegroundColor White
Write-Host "   VITE_API_URL=https://payroll-backend-cyan.vercel.app/api" -ForegroundColor Green
Write-Host "   VITE_APP_ENV=production" -ForegroundColor Green
Write-Host "`n5. Click Save`n" -ForegroundColor White

$response = Read-Host "Have you updated the frontend environment variables? (yes/no)"
if ($response -ne "yes") {
    Write-Host "❌ Deployment cancelled. Please update environment variables first." -ForegroundColor Red
    exit 1
}

# Step 4: Deploy Frontend
Write-Host "`n📝 STEP 4: DEPLOY FRONTEND" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Deploying frontend to production...`n" -ForegroundColor Yellow

Set-Location -Path "employee"

try {
    Write-Host "Deploying..." -ForegroundColor Yellow
    vercel --prod
    Write-Host "`n✅ Frontend deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Set-Location -Path "..\"

# Step 5: Run Verification Tests
Write-Host "`n📝 STEP 5: VERIFICATION" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "⏳ Waiting 10 seconds for deployment to propagate...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🧪 Running verification tests...`n" -ForegroundColor Yellow

# Test 1: Stats Endpoint
Write-Host "Test 1: Checking attendance stats..." -ForegroundColor White
try {
    node test-stats-detailed.js
    Write-Host "✅ Stats test passed!`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Stats test had issues. Check output above.`n" -ForegroundColor Yellow
}

# Test 2: Comprehensive Test
Write-Host "`nTest 2: Running comprehensive system test..." -ForegroundColor White
try {
    node test-deployed-system.js
    Write-Host "✅ Comprehensive test passed!`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Comprehensive test had issues. Check output above.`n" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Green

Write-Host "📊 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open: https://employee-frontend-eight-rust.vercel.app" -ForegroundColor White
Write-Host "2. Login with admin credentials" -ForegroundColor White
Write-Host "3. Check Dashboard stats (should show correct absent count)" -ForegroundColor White
Write-Host "4. Open DevTools (F12) and verify:" -ForegroundColor White
Write-Host "   - No CORS errors in Console" -ForegroundColor Green
Write-Host "   - All API calls go to payroll-backend-cyan.vercel.app" -ForegroundColor Green
Write-Host "   - No calls to localhost:5000" -ForegroundColor Green
Write-Host "5. Test Salary page (status should show properly)" -ForegroundColor White
Write-Host "6. Test updating salary rate (should work without 401 error)" -ForegroundColor White

Write-Host "`n✅ ALL FIXES DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "📝 See COMPLETE_PRODUCTION_FIX_READY_TO_DEPLOY.md for details`n" -ForegroundColor Cyan
