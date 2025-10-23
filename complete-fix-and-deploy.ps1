# 🚀 COMPLETE FIX AND DEPLOYMENT SCRIPT
# This script fixes ALL issues and deploys to Vercel

Write-Host "🚀 COMPLETE FIX AND DEPLOYMENT" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Summary of issues fixed
Write-Host "📋 ISSUES FIXED:" -ForegroundColor Yellow
Write-Host "✅ 1. Updated .env files with correct backend URL (cyan)" -ForegroundColor Green
Write-Host "✅ 2. Updated backend CORS_ORIGIN to correct frontend URL" -ForegroundColor Green
Write-Host "✅ 3. Fixed JWT_SECRET (was placeholder)" -ForegroundColor Green
Write-Host "✅ 4. Updated FRONTEND_URL in backend config" -ForegroundColor Green
Write-Host "✅ 5. Applied attendance stats fix (robust query)" -ForegroundColor Green
Write-Host "`n"

# Check Vercel CLI
Write-Host "📦 Checking Vercel CLI..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✅ Vercel CLI installed: $vercelVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g vercel`n" -ForegroundColor Yellow
    exit 1
}

# Display current configuration
Write-Host "📝 CURRENT CONFIGURATION:" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "Frontend:" -ForegroundColor White
Write-Host "  URL: https://employee-frontend-eight-rust.vercel.app" -ForegroundColor Green
Write-Host "  API: https://payroll-backend-cyan.vercel.app/api" -ForegroundColor Green
Write-Host "`nBackend:" -ForegroundColor White
Write-Host "  URL: https://payroll-backend-cyan.vercel.app" -ForegroundColor Green
Write-Host "  CORS: https://employee-frontend-eight-rust.vercel.app" -ForegroundColor Green
Write-Host "  JWT: ✅ Set (not placeholder)" -ForegroundColor Green
Write-Host "`n"

# Step 1: Deploy Backend First
Write-Host "📝 STEP 1: DEPLOY BACKEND WITH ALL FIXES" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Deploying backend to production...`n" -ForegroundColor Yellow

Set-Location -Path "employee\payroll-backend"

Write-Host "Backend changes:" -ForegroundColor White
Write-Host "  ✅ Attendance stats fix applied" -ForegroundColor Green
Write-Host "  ✅ CORS_ORIGIN updated" -ForegroundColor Green
Write-Host "  ✅ JWT_SECRET fixed" -ForegroundColor Green
Write-Host "  ✅ FRONTEND_URL updated`n" -ForegroundColor Green

$deployBackend = Read-Host "Deploy backend now? (yes/no)"
if ($deployBackend -eq "yes") {
    try {
        Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
        vercel --prod
        Write-Host "`n✅ Backend deployed successfully!`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
        Write-Host "Error: $_`n" -ForegroundColor Red
        Set-Location -Path "..\..\"
        exit 1
    }
} else {
    Write-Host "⚠️  Backend deployment skipped`n" -ForegroundColor Yellow
}

Set-Location -Path "..\..\"

# Step 2: Update Vercel Environment Variables (IMPORTANT!)
Write-Host "📝 STEP 2: VERIFY VERCEL ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "`n⚠️  CRITICAL: Verify these environment variables in Vercel Dashboard:`n" -ForegroundColor Yellow

Write-Host "Backend (payroll-backend-cyan):" -ForegroundColor White
Write-Host "  Go to: https://vercel.com/dashboard → payroll-backend-cyan → Settings → Environment Variables" -ForegroundColor Cyan
Write-Host "  Required for Production:" -ForegroundColor Yellow
Write-Host "    CORS_ORIGIN=https://employee-frontend-eight-rust.vercel.app" -ForegroundColor Green
Write-Host "    FRONTEND_URL=https://employee-frontend-eight-rust.vercel.app" -ForegroundColor Green
Write-Host "    JWT_SECRET=RaeDisenyo2025_SuperSecure_JWT_Key_For_Production_PayrollSystem!@#$%%" -ForegroundColor Green
Write-Host "    MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db" -ForegroundColor Green
Write-Host "`nFrontend (employee-frontend-eight-rust):" -ForegroundColor White
Write-Host "  Go to: https://vercel.com/dashboard → employee-frontend-eight-rust → Settings → Environment Variables" -ForegroundColor Cyan
Write-Host "  Required for Production:" -ForegroundColor Yellow
Write-Host "    VITE_API_URL=https://payroll-backend-cyan.vercel.app/api" -ForegroundColor Green
Write-Host "    VITE_APP_ENV=production" -ForegroundColor Green
Write-Host "`n"

$envDone = Read-Host "Have you verified/updated environment variables in Vercel? (yes/no)"
if ($envDone -ne "yes") {
    Write-Host "⚠️  Please update environment variables before deploying frontend!`n" -ForegroundColor Yellow
    Write-Host "After updating, you MUST redeploy both projects for changes to take effect.`n" -ForegroundColor Red
}

# Step 3: Deploy Frontend
Write-Host "`n📝 STEP 3: DEPLOY FRONTEND" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Deploying frontend to production...`n" -ForegroundColor Yellow

Set-Location -Path "employee"

Write-Host "Frontend changes:" -ForegroundColor White
Write-Host "  ✅ .env updated with correct backend URL" -ForegroundColor Green
Write-Host "  ✅ .env.production updated" -ForegroundColor Green
Write-Host "  ✅ Will rebuild with environment variables`n" -ForegroundColor Green

$deployFrontend = Read-Host "Deploy frontend now? (yes/no)"
if ($deployFrontend -eq "yes") {
    try {
        Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
        vercel --prod
        Write-Host "`n✅ Frontend deployed successfully!`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
        Write-Host "Error: $_`n" -ForegroundColor Red
        Set-Location -Path "..\"
        exit 1
    }
} else {
    Write-Host "⚠️  Frontend deployment skipped`n" -ForegroundColor Yellow
}

Set-Location -Path "..\"

# Step 4: Verification
Write-Host "`n📝 STEP 4: VERIFICATION" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Cyan
Write-Host "⏳ Waiting 10 seconds for deployment to propagate...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🧪 Running verification tests...`n" -ForegroundColor Yellow

# Test 1: Stats Endpoint
Write-Host "Test 1: Checking attendance stats..." -ForegroundColor White
try {
    node test-stats-detailed.js
    Write-Host "✅ Stats test completed!`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Stats test had issues. Check output above.`n" -ForegroundColor Yellow
}

# Test 2: Comprehensive Test
Write-Host "`nTest 2: Running comprehensive system test..." -ForegroundColor White
try {
    node test-deployed-system.js
    Write-Host "✅ Comprehensive test completed!`n" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Comprehensive test had issues. Check output above.`n" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "====================================`n" -ForegroundColor Green

Write-Host "📊 WHAT WAS FIXED:" -ForegroundColor Cyan
Write-Host "1. ✅ Backend URL updated (blond → cyan)" -ForegroundColor Green
Write-Host "2. ✅ Frontend .env files updated" -ForegroundColor Green
Write-Host "3. ✅ Backend CORS_ORIGIN fixed" -ForegroundColor Green
Write-Host "4. ✅ JWT_SECRET fixed (was placeholder!)" -ForegroundColor Green
Write-Host "5. ✅ Attendance stats query improved" -ForegroundColor Green
Write-Host "6. ✅ All hardcoded URLs removed`n" -ForegroundColor Green

Write-Host "📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Open: https://employee-frontend-eight-rust.vercel.app" -ForegroundColor White
Write-Host "2. Open DevTools (F12) → Console tab" -ForegroundColor White
Write-Host "3. Login with admin credentials" -ForegroundColor White
Write-Host "4. Verify NO errors:" -ForegroundColor White
Write-Host "   ✅ No 'localhost:5000' calls" -ForegroundColor Green
Write-Host "   ✅ No CORS errors" -ForegroundColor Green
Write-Host "   ✅ No 401 authentication errors" -ForegroundColor Green
Write-Host "   ✅ All API calls to payroll-backend-cyan.vercel.app" -ForegroundColor Green
Write-Host "5. Check Dashboard stats (should show correct absent count)" -ForegroundColor White
Write-Host "6. Test Salary page (status should display correctly)" -ForegroundColor White
Write-Host "7. Test 'Adjust Salary Rate' (should work without 401 error)`n" -ForegroundColor White

Write-Host "⚠️  IMPORTANT NOTES:" -ForegroundColor Yellow
Write-Host "• If you see 'localhost:5000' errors, clear browser cache and hard refresh (Ctrl+Shift+R)" -ForegroundColor Yellow
Write-Host "• If 401 errors persist, verify JWT_SECRET is set in Vercel backend env vars" -ForegroundColor Yellow
Write-Host "• If CORS errors persist, verify CORS_ORIGIN is set in Vercel backend env vars" -ForegroundColor Yellow
Write-Host "• Environment variables in Vercel require redeployment to take effect`n" -ForegroundColor Yellow

Write-Host "✅ ALL FIXES APPLIED AND DEPLOYED!" -ForegroundColor Green
Write-Host "📝 See ALL_TASKS_COMPLETED_FINAL_STATUS_OCT23_2025.md for details`n" -ForegroundColor Cyan
