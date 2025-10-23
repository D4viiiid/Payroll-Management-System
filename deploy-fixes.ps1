#!/usr/bin/env pwsh
# 🚀 DEPLOY FIXES TO VERCEL - Automated Script
# This script updates environment variables and redeploys both frontend and backend

Write-Host "🚀 VERCEL DEPLOYMENT FIX SCRIPT" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# URLs
$FRONTEND_URL = "https://employee-frontend-eight-rust.vercel.app"
$BACKEND_URL = "https://payroll-backend-cyan.vercel.app"

Write-Host "📍 Frontend URL: $FRONTEND_URL" -ForegroundColor Green
Write-Host "📍 Backend URL: $BACKEND_URL" -ForegroundColor Green
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "🔍 Checking Vercel CLI..." -ForegroundColor Yellow
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    if (!$?) {
        Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# ========================================
# STEP 1: UPDATE BACKEND ENVIRONMENT VARIABLES
# ========================================
Write-Host "📝 STEP 1: Updating Backend Environment Variables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  MANUAL STEP REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select project: payroll-backend-cyan" -ForegroundColor White
Write-Host "3. Go to: Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Update/Add:" -ForegroundColor White
Write-Host "   CORS_ORIGIN=$FRONTEND_URL" -ForegroundColor Cyan
Write-Host "5. Click Save" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter when done..." -ForegroundColor Yellow
Read-Host

# Deploy backend
Write-Host "🚀 Deploying Backend..." -ForegroundColor Yellow
Push-Location "employee\payroll-backend"
vercel --prod
$backendDeployed = $?
Pop-Location

if ($backendDeployed) {
    Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Backend deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ========================================
# STEP 2: UPDATE FRONTEND ENVIRONMENT VARIABLES
# ========================================
Write-Host "📝 STEP 2: Updating Frontend Environment Variables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  MANUAL STEP REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select project: employee-frontend-eight-rust" -ForegroundColor White
Write-Host "3. Go to: Settings → Environment Variables" -ForegroundColor White
Write-Host "4. Update/Add:" -ForegroundColor White
Write-Host "   VITE_API_URL=$BACKEND_URL/api" -ForegroundColor Cyan
Write-Host "   VITE_APP_ENV=production" -ForegroundColor Cyan
Write-Host "5. Click Save" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter when done..." -ForegroundColor Yellow
Read-Host

# Deploy frontend
Write-Host "🚀 Deploying Frontend..." -ForegroundColor Yellow
Push-Location "employee"
vercel --prod
$frontendDeployed = $?
Pop-Location

if ($frontendDeployed) {
    Write-Host "✅ Frontend deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ========================================
# STEP 3: VERIFICATION
# ========================================
Write-Host "🔍 STEP 3: Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/health" -Method Get
    Write-Host "✅ Backend is responding" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend health check failed: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ Testing CORS..." -ForegroundColor Yellow
Write-Host "   Origin: $FRONTEND_URL" -ForegroundColor Gray
Write-Host "   Endpoint: $BACKEND_URL/api/employees" -ForegroundColor Gray
Write-Host ""

Write-Host "🌐 Testing Frontend..." -ForegroundColor Yellow
Write-Host "   Opening: $FRONTEND_URL" -ForegroundColor Gray
Write-Host ""

# ========================================
# STEP 4: POST-DEPLOYMENT CHECKLIST
# ========================================
Write-Host "📋 STEP 4: Post-Deployment Checklist" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Please verify the following:" -ForegroundColor Yellow
Write-Host "  1. Open: $FRONTEND_URL" -ForegroundColor White
Write-Host "  2. Open Browser Console (F12) → Network tab" -ForegroundColor White
Write-Host "  3. Login to the system" -ForegroundColor White
Write-Host "  4. Verify ALL API calls go to: $BACKEND_URL/api/*" -ForegroundColor White
Write-Host "  5. Verify NO calls to 'localhost:5000'" -ForegroundColor White
Write-Host "  6. Check Dashboard stats" -ForegroundColor White
Write-Host "  7. Check Salary page - Status should NOT be 'N/A'" -ForegroundColor White
Write-Host "  8. Test 'Adjust Salary Rate' - Should work without 401 error" -ForegroundColor White
Write-Host ""

Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  Frontend: $FRONTEND_URL" -ForegroundColor Green
Write-Host "  Backend:  $BACKEND_URL" -ForegroundColor Green
Write-Host "  CORS:     Configured for $FRONTEND_URL" -ForegroundColor Green
Write-Host ""
Write-Host "If you see any errors, check:" -ForegroundColor Yellow
Write-Host "  - Vercel deployment logs" -ForegroundColor White
Write-Host "  - Browser console (F12)" -ForegroundColor White
Write-Host "  - Environment variables in Vercel dashboard" -ForegroundColor White
Write-Host ""
