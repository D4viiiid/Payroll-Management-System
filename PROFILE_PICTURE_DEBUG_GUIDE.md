# 🔍 Profile Picture Upload Debug Guide

## Current Status
✅ **Backend Server**: Running on http://localhost:5000  
✅ **Frontend Server**: Running on http://localhost:5174  
✅ **Enhanced Logging**: Added to both frontend and backend

---

## 🎯 Testing Instructions

### Step 1: Open the Application
1. Open your browser to: **http://localhost:5174**
2. Login with employee **EMP-9080** credentials
3. Open browser Developer Tools (F12)
4. Go to the **Console** tab

### Step 2: Attempt Profile Picture Upload
1. Click on the profile picture to upload a new image
2. Select a different image file (JPEG/PNG/WebP)
3. Wait for the upload to complete

### Step 3: Monitor the Logs

#### 📊 Frontend Console Logs (Browser)
Look for these log messages in sequence:

```
📸 Sending profile picture to API for employee EMP-9080
📸 Compressed base64 length: XXXXX
📸 Compressed base64 preview: data:image/jpeg;base64,/9j/4AAQSkZJRg...
📸 API Response received: {message: "...", profilePicture: "..."}
📸 Response has profilePicture: true
📸 Response profilePicture length: XXXXX
📸 Response profilePicture preview: data:image/jpeg;base64,/9j/4AAQ...
📸 Updated employee state with new profile picture
📸 Updated localStorage with new profile picture
```

**THEN** look for any subsequent calls:
```
📊 fetchEmployeeData called - START
📊 Employee data from localStorage: {id: "...", hasProfilePicture: true, profilePictureLength: XXXXX}
🔄 Fetching fresh employee data from database for ID: ...
✅ Fresh employee data fetched: {id: "...", hasProfilePicture: ???, profilePictureLength: ???}
🔄 Merged employee data with preserved profile picture: {hasProfilePicture: ???, profilePictureLength: ???}
📊 fetchEmployeeData completed - localStorage updated
```

#### 🖥️ Backend Terminal Logs (PowerShell)
Look for these in the backend terminal (where you ran `npm start`):

```
📸 Received profile picture update request
   Employee ID: EMP-9080
   Profile picture data length: XXXXX
   Profile picture preview: data:image/jpeg;base64,/9j/4AAQSkZJRg...
📸 Profile picture saved to employee document
📸 After save - profile picture in DB: XXXXX
📸 Returning profile picture to frontend: data:image/jpeg;base64,/9j/4AAQ...
```

---

## 🐛 What to Look For

### Scenario A: Upload Fails to Reach Backend
**Symptoms:**
- ✅ Frontend shows "Compressed base64 length: XXXXX"
- ❌ NO backend logs appear
- ❌ No "Received profile picture update request" message

**Root Cause:** API call not reaching backend (network error, wrong URL, CORS issue)

---

### Scenario B: Backend Receives Wrong Data
**Symptoms:**
- ✅ Backend receives request
- ❌ "Profile picture data length: 0" or "null"
- ❌ "Profile picture preview: null"

**Root Cause:** Frontend sending wrong request body format

---

### Scenario C: Backend Saves But Returns Wrong Data
**Symptoms:**
- ✅ Backend saves successfully
- ✅ "After save - profile picture in DB: XXXXX" shows correct length
- ❌ "Returning profile picture to frontend: null" or wrong data

**Root Cause:** Database retrieval issue after save

---

### Scenario D: Frontend Receives Response But Gets Overwritten
**Symptoms:**
- ✅ "API Response received" shows correct data
- ✅ "Updated employee state" and "Updated localStorage"
- ✅ Then immediately: "fetchEmployeeData called - START"
- ❌ "Fresh employee data fetched" shows `hasProfilePicture: false` or different length
- ❌ Image reverts to red circle

**Root Cause:** `fetchEmployeeData()` being triggered by event listener and overwriting the new profile picture with old database data

---

### Scenario E: Backend GET Endpoint Returns Stale Data
**Symptoms:**
- ✅ Upload saves correctly to database
- ✅ PUT endpoint returns correct data
- ❌ Subsequent GET requests return old/null profilePicture
- ❌ "Fresh employee data fetched" shows wrong data

**Root Cause:** Caching issue or database query not selecting profilePicture field

---

## 📋 Report Template

After testing, please provide me with:

### 1. Frontend Console Output
Copy ALL logs containing:
- `📸` (camera emoji - upload logs)
- `📊` (chart emoji - fetch logs)  
- Any errors in red

### 2. Backend Terminal Output  
Copy ALL logs containing:
- `📸` (camera emoji - save logs)
- Any errors

### 3. Observed Behavior
- [ ] Did the success toast appear?
- [ ] Did the image change (even briefly)?
- [ ] Did the image revert to red circle?
- [ ] How many times did you see "fetchEmployeeData called"?

---

## 🔧 Next Steps Based on Findings

Once I see your logs, I can:
1. **Scenario A**: Fix API endpoint URL or CORS configuration
2. **Scenario B**: Fix request body format in frontend
3. **Scenario C**: Fix database query in backend
4. **Scenario D**: Prevent unnecessary refetch or ensure merge logic works
5. **Scenario E**: Fix GET endpoint caching or field selection

---

## ⚠️ Important Notes

- Keep the browser console open the **entire time**
- Don't refresh the page between tests
- If you see multiple "fetchEmployeeData called" logs, note the timestamps
- The logs will show **exactly** where in the flow the data is being lost

---

**Ready to test!** 🚀  
Upload a new profile picture and copy the logs for analysis.
