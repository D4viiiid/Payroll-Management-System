# 🧪 PRODUCTION DEPLOYMENT TEST PLAN

**Date:** October 22, 2025  
**Status:** Ready for Testing After Backend Redeploy

---

## 🎯 ROOT CAUSES IDENTIFIED AND FIXED

### ❌ Issue 1: Backend 500 Error (FUNCTION_INVOCATION_FAILED)

**Root Cause:**

- Backend `vercel.json` used deprecated `builds` and `routes` configuration
- Vercel couldn't properly invoke the serverless function
- Missing proper serverless function export

**Culprit Files:**

- `employee/payroll-backend/vercel.json` - Had deprecated config
- `employee/payroll-backend/server.js` - Didn't export app for Vercel

**Fixes Applied:**
✅ Removed `builds` and `routes` from vercel.json
✅ Created `api/index.js` serverless function entry point
✅ Modified `server.js` to export app properly
✅ Added Vercel environment detection (VERCEL !== '1')

---

### ❌ Issue 2: CORS Error (Failed to Fetch)

**Root Cause:**

- Backend CORS was set to `cors()` without configuration
- Didn't read `CORS_ORIGIN` environment variable
- Missing proper CORS headers for preflight requests

**Culprit:**

- `server.js` line 72: `app.use(cors())` - No config passed

**Fixes Applied:**
✅ Created `corsOptions` object with environment variable
✅ Added `credentials: true` for cookie/auth support
✅ Added all necessary HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
✅ Added proper headers (Content-Type, Authorization, X-Requested-With)
✅ Added console logging to verify CORS origin

---

## 📋 PRE-TEST CHECKLIST

Before running tests, ensure you've completed:

- [ ] Updated `CORS_ORIGIN` in Vercel backend settings to:
      `https://employee-mt2x1grg7-davids-projects-3d1b15ee.vercel.app`
- [ ] Redeployed backend from Vercel dashboard
- [ ] Wait 1-2 minutes for deployment to complete
- [ ] Verified build logs show NO "WARN! Due to builds" message
- [ ] Verified deployment status shows "Ready"

---

## 🧪 TEST SUITE

### Test 1: Backend Health Check ✅

**Objective:** Verify backend is running and responding

**Steps:**

1. Open browser
2. Navigate to: `https://payroll-management-system-blond.vercel.app/api/health`

**Expected Result:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T...",
  "environment": "production"
}
```

**Pass Criteria:**

- ✅ Status code: 200
- ✅ Response contains "status": "healthy"
- ✅ No 500 errors
- ✅ Response time < 2 seconds

**If Failed:**

- Check Vercel function logs
- Verify MongoDB connection string
- Check environment variables are set

---

### Test 2: CORS Preflight Check ✅

**Objective:** Verify CORS headers are properly configured

**Steps:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:

```javascript
fetch("https://payroll-management-system-blond.vercel.app/api/health", {
  method: "OPTIONS",
  headers: {
    Origin: "https://employee-mt2x1grg7-davids-projects-3d1b15ee.vercel.app",
    "Access-Control-Request-Method": "POST",
  },
})
  .then((r) => console.log("✅ CORS OK", r.status))
  .catch((e) => console.error("❌ CORS Failed", e));
```

**Expected Result:**

- Console shows: `✅ CORS OK 200` or `204`
- No CORS errors in console

**Pass Criteria:**

- ✅ No "has been blocked by CORS policy" error
- ✅ Response includes `Access-Control-Allow-Origin` header
- ✅ Header value matches frontend URL

**If Failed:**

- Double-check CORS_ORIGIN environment variable
- Ensure backend was redeployed after updating env var
- Check backend logs for CORS configuration output

---

### Test 3: Frontend Loading ✅

**Objective:** Verify frontend loads without errors

**Steps:**

1. Open browser (incognito/private mode recommended)
2. Navigate to: `https://employee-mt2x1grg7-davids-projects-3d1b15ee.vercel.app`
3. Open DevTools (F12) → Console tab
4. Open DevTools → Network tab

**Expected Result:**

- Page loads and displays login form
- No 404 errors
- No "NOT_FOUND" errors
- Login form is visible with username/password fields

**Pass Criteria:**

- ✅ Login page displays correctly
- ✅ No console errors (red text)
- ✅ Network tab shows 200 status for HTML/JS/CSS
- ✅ No "Failed to fetch" errors

**If Failed:**

- Check browser console for specific errors
- Verify frontend vercel.json has SPA routing
- Clear browser cache and try again

---

### Test 4: Login Functionality ✅

**Objective:** Verify login works end-to-end

**Steps:**

1. On login page: `https://employee-mt2x1grg7-davids-projects-3d1b15ee.vercel.app`
2. Keep DevTools open (F12) → Network tab
3. Enter credentials:
   - Username: `ADMIN`
   - Password: `ADMIN123`
4. Click "SIGN IN" button
5. Watch Network tab for API call

**Expected Result:**

- Login button shows loading state
- Network tab shows POST to `/api/employees/login`
- Response status: 200
- Response body contains JWT token
- Page redirects to dashboard
- Dashboard displays employee data

**Pass Criteria:**

- ✅ No "Failed to fetch" error
- ✅ No CORS errors in console
- ✅ Login API returns 200 status
- ✅ JWT token is received
- ✅ Redirect to dashboard occurs
- ✅ User sees "Welcome" message or dashboard content

**If Failed:**

- Check Network tab for exact error
- Verify CORS_ORIGIN is correct
- Check backend function logs in Vercel
- Verify MongoDB connection is working
- Check if ADMIN user exists in database

---

### Test 5: Dashboard Data Loading ✅

**Objective:** Verify dashboard fetches data from backend

**Steps:**

1. After successful login, you should be on dashboard
2. Keep DevTools open → Network tab
3. Observe API calls being made
4. Check for:
   - Employee count/list
   - Attendance records
   - Payroll data
   - Statistics/cards

**Expected Result:**

- Multiple API calls to backend
- All return 200 status codes
- Dashboard displays data (not loading forever)
- No error messages on page

**Pass Criteria:**

- ✅ Dashboard shows employee count
- ✅ Dashboard shows recent attendance
- ✅ Dashboard shows statistics
- ✅ All API calls return 200
- ✅ No "Failed to load" messages

**If Failed:**

- Check which specific API endpoint is failing
- Verify MongoDB has data
- Check backend logs for database errors
- Verify authentication token is being sent

---

### Test 6: Employee Management ✅

**Objective:** Verify CRUD operations work

**Steps:**

1. From dashboard, navigate to "Employees" page
2. Wait for employee list to load
3. Click on an employee to view details
4. Try editing an employee (if permitted)
5. Watch Network tab for API calls

**Expected Result:**

- Employee list displays
- Click opens employee details
- Edit form shows current data
- Save triggers PUT/PATCH request
- Response returns updated data

**Pass Criteria:**

- ✅ GET /api/employees returns 200
- ✅ Employee list renders
- ✅ Click works without errors
- ✅ Edit/update triggers correct API call
- ✅ Data persists after update

**If Failed:**

- Check console for JavaScript errors
- Verify API endpoint exists
- Check authentication token
- Verify database permissions

---

### Test 7: Attendance Records ✅

**Objective:** Verify attendance data displays

**Steps:**

1. Navigate to "Attendance" page
2. Check if attendance records load
3. Try filtering by date (if available)
4. Watch Network tab

**Expected Result:**

- Attendance records display
- Table shows employee names, dates, times
- Filtering works (if implemented)

**Pass Criteria:**

- ✅ GET /api/attendance returns 200
- ✅ Records display in table/list
- ✅ Data is accurate
- ✅ No loading errors

---

### Test 8: Payroll Processing ✅

**Objective:** Verify payroll page loads

**Steps:**

1. Navigate to "Payroll" page
2. Check if payroll data loads
3. Observe any calculations/totals

**Expected Result:**

- Payroll records display
- Calculations appear correct
- No errors

**Pass Criteria:**

- ✅ GET /api/payrolls returns 200
- ✅ Payroll data renders
- ✅ Totals calculate correctly

---

### Test 9: Logout Functionality ✅

**Objective:** Verify logout works

**Steps:**

1. Click logout button (usually top-right)
2. Verify redirect to login page
3. Try accessing dashboard URL directly

**Expected Result:**

- Logout clears token
- Redirects to login
- Cannot access protected routes without login

**Pass Criteria:**

- ✅ Logout button works
- ✅ Redirects to /login
- ✅ Token is cleared from localStorage
- ✅ Cannot access dashboard without re-login

---

### Test 10: Error Handling ✅

**Objective:** Verify proper error messages

**Steps:**

1. Go to login page
2. Enter wrong credentials:
   - Username: `WRONG`
   - Password: `WRONG123`
3. Click login

**Expected Result:**

- Shows "Invalid credentials" or similar message
- Does not crash
- Can try again

**Pass Criteria:**

- ✅ Shows user-friendly error message
- ✅ No console errors
- ✅ Login form still works
- ✅ Can retry with correct credentials

---

## 📊 TEST RESULTS SUMMARY

After completing all tests, fill this out:

```
Test 1 - Backend Health:        [ ] PASS  [ ] FAIL
Test 2 - CORS Preflight:         [ ] PASS  [ ] FAIL
Test 3 - Frontend Loading:       [ ] PASS  [ ] FAIL
Test 4 - Login Functionality:    [ ] PASS  [ ] FAIL
Test 5 - Dashboard Loading:      [ ] PASS  [ ] FAIL
Test 6 - Employee Management:    [ ] PASS  [ ] FAIL
Test 7 - Attendance Records:     [ ] PASS  [ ] FAIL
Test 8 - Payroll Processing:     [ ] PASS  [ ] FAIL
Test 9 - Logout Functionality:   [ ] PASS  [ ] FAIL
Test 10 - Error Handling:        [ ] PASS  [ ] FAIL

OVERALL STATUS: [ ] ALL PASS  [ ] SOME FAILED
```

---

## 🔍 DEBUGGING GUIDE

### If Login Still Fails After All Fixes:

**Check 1: Verify CORS_ORIGIN**

```bash
# In Vercel Dashboard → Backend → Settings → Environment Variables
# CORS_ORIGIN should be:
https://employee-mt2x1grg7-davids-projects-3d1b15ee.vercel.app
# NO trailing slash!
```

**Check 2: Verify Backend Redeployed**

```
1. Go to Vercel Dashboard
2. Click backend project
3. Click Deployments tab
4. Check timestamp of latest deployment
5. Should be AFTER you updated CORS_ORIGIN
```

**Check 3: Check Backend Logs**

```
1. Vercel Dashboard → Backend → Deployments
2. Click latest deployment
3. Click "View Function Logs"
4. Look for errors in logs
5. Should see: "🔒 CORS Configuration: Allowed Origin: https://employee-mt2x1grg7..."
```

**Check 4: Browser DevTools**

```
1. Open DevTools (F12)
2. Console tab - look for red errors
3. Network tab - check failed requests
4. Click failed request → Headers tab
5. Check Response Headers for Access-Control-Allow-Origin
```

---

## ✅ SUCCESS CRITERIA

Deployment is successful when:

1. ✅ Backend health endpoint returns 200
2. ✅ Frontend loads without 404 errors
3. ✅ Login with ADMIN/ADMIN123 works
4. ✅ Dashboard displays data
5. ✅ All CRUD operations work
6. ✅ No CORS errors in console
7. ✅ No "Failed to fetch" errors
8. ✅ Logout works correctly
9. ✅ Error messages are user-friendly
10. ✅ All test cases pass

---

## 🚀 AFTER SUCCESSFUL TESTING

Once all tests pass:

1. **Document URLs:**

   - Save frontend URL for users
   - Save backend URL for reference
   - Update any documentation

2. **Optional Enhancements:**

   - Set up custom domain (Vercel Settings)
   - Configure MongoDB IP whitelist (restrict to Vercel IPs)
   - Enable Vercel Analytics
   - Set up monitoring/alerts

3. **User Training:**
   - Share production URL with users
   - Provide login credentials
   - Document biometric limitations (requires desktop app)

---

## 🆘 GET HELP

If tests fail after following all steps:

1. **Share These Details:**

   - Which test failed (test number)
   - Exact error message from console
   - Screenshot of Network tab
   - Backend function logs from Vercel

2. **Common Issues:**
   - CORS still failing → Verify CORS_ORIGIN exactly matches frontend URL
   - 500 errors → Check backend logs for MongoDB connection issues
   - Login fails → Verify ADMIN user exists in database
   - Data not loading → Check MongoDB Atlas IP whitelist

---

**Testing completed on:** ******\_******  
**All tests passed:** [ ] YES [ ] NO  
**Issues found:** **********************\_**********************  
**Resolution:** **********************\_\_\_\_**********************
