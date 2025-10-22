
**Version:** 1.0  
**Owner:** Allan  
**System:** Employee Management + Biometric Attendance + Payroll System

---

## 🚀 General Guidelines

### Codebase Separation

* All backend code must be located in `employee/payroll-backend/`.
* All frontend code must be located in `employee/src/`.
* Biometric integration Python scripts must be in `employee/Biometric_connect/`.
* Clear boundaries between backend, frontend, biometric services, and shared assets must be maintained.

### Frameworks & Tech Stack

* **Backend:** Node.js with Express (ES Modules).
* **Database:** MongoDB (cloud-hosted via MongoDB Atlas).
* **Database Name:** `employee_db`.
* **Frontend:** React with Vite, functional components, hooks, and context.
* **Package Manager:** `npm`.
* **Biometric Device:** ZKTeco fingerprint scanner using `pyzkfp` (ZKFP2) Python library.
* **Styling:** TailwindCSS + Bootstrap + custom CSS.
* **Real-time Features:** Event bus pattern with custom event emitters.

### No Static Data

* Static JSON files, hardcoded mock arrays, or temporary fixtures must never be used in production.
* All data must always originate from MongoDB queries.
* Local storage (localStorage.js) is only used as a fallback when MongoDB connection fails.

### Environment Variables

* All sensitive credentials, tokens, or keys must be stored in `config.env` (backend) or `.env` (frontend).
* `.env` and `config.env` files must always be excluded from version control.
* Environment variables must be loaded at application startup using `dotenv`.
* The system must validate the presence of all required environment variables before initializing.

### File Duplication

* Multiple versions of files with suffixes such as `-final`, `-working`, `-enhanced`, `-updated`, `-test`, `-backup`, `-ipc`, `-simple`, `-fixed`, `-complete`, or `-legacy` must not exist in production.
* Existing duplicates must be merged into one canonical version with a clean filename.
* After merging, all import paths across the project must be updated.
* **Current duplicates to resolve:**
  * `biometricRoutes.js`, `biometricRoutes_ipc.js`, `biometricRoutes_complete.js`, `biometricRoutes_fixed.js`, `biometricRoutes_simple.js`
  * `apiService.js`, `apiService_updated.js`
  * `biometricService.js`, `biometricService_updated.js`
  * `Login.jsx`, `Login_biometric.jsx`, `Login_biometric_final.jsx`
  * `Employee_legacy.js`, `EmployeeModels.js`, `oldEmployeeModel.js`
  * `server.js`, `server_backup.js`, `server_ipc.js`

### Priority Order

1. **Security:** Authentication, authorization, input validation, password hashing, JWT token management.
2. **Single Source of Truth:** Only one canonical file per feature or module.
3. **Database-Driven:** MongoDB must always be the authoritative source.
4. **Clean Architecture:** Strict separation of models, routes, middleware, and utilities.
5. **Error Handling:** User-friendly messages, comprehensive logging, and graceful recovery.

---

## ⚡ Server Configuration

### Backend Entry Point

* Only `employee/payroll-backend/server.js` must be used as the backend entry point.
* The backend must always run on port `5000`.
* The frontend development server (Vite) must always run on port `5173` (default) with proxy to port `5000`.

### Middleware Stack (Order Matters)

1. **CORS:** `cors()` - Allow cross-origin requests from frontend.
2. **Body Parsers:** `express.json()` - Parse JSON request bodies.
3. **Logging:** `morgan('dev')` - Log all HTTP requests.
4. **Security:** `helmet()` - Secure HTTP headers.
5. **Custom Debug Logger:** Log all incoming requests with method and URL.
6. **Routes:** Mount all API routes under `/api`.
7. **Error Handler:** Centralized error-handling middleware (must be last).

### Required Middleware

* **Authentication Middleware (`middleware/auth.js`):**
  * `auth`: Verify JWT tokens from `Authorization` header.
  * `adminAuth`: Verify admin privileges (must be used after `auth`).
* **Validation Middleware (`middleware/validation.js`):** Validate incoming request data.
* **Error Handler (`middleware/errorHandler.js`):** Catch and format all errors.

---

## 🌐 API Rules

### Endpoint Conventions

* All endpoints must begin with `/api`.
* RESTful design conventions must be followed.
* Resources must be named using plural nouns.
* Nested resources must follow logical hierarchy.

### Core API Routes

| Route | Purpose | Main File |
|-------|---------|-----------|
| `/api/employees` | Employee CRUD operations | `routes/Employee.js` |
| `/api/biometric` | Biometric enrollment & login | `routes/biometricRoutes_ipc.js` |
| `/api/fingerprint` | Fingerprint operations | `routes/fingerprint.routes.js` |
| `/api/attendance` | Attendance tracking | `routes/attendance.js` |
| `/api/deductions` | Employee deductions | `routes/deductionRouter.js` |
| `/api/payrolls` | Payroll management | `routes/payrollRouter.js` |
| `/api/salary` | Salary records | `routes/salaryRouter.js` |
| `/api/email` | Email notifications | `routes/testEmail.js` |

### API Response Format

* All responses must include:
  ```json
  {
    "success": true/false,
    "message": "Descriptive message",
    "data": {...} or [...],
    "error": "Error details (if applicable)"
  }
  ```
* HTTP status codes must be appropriate:
  * `200` - Success
  * `201` - Created
  * `400` - Bad request / validation error
  * `401` - Unauthorized
  * `403` - Forbidden
  * `404` - Not found
  * `500` - Internal server error

### Pagination, Filtering, and Sorting

* Large datasets must support pagination with `limit` and `skip`.
* Filtering must support query parameters.
* Sorting must be supported using MongoDB `.sort()` method.
* Default sort: newest first (`.sort({ createdAt: -1 })`).

### Error Handling

* Responses must use consistent error structures.
* Validation errors must identify problematic fields.
* Database errors must be caught and logged without exposing internals.
* Never expose stack traces in production responses.

---

## 📂 Project Structure

### Backend (`employee/payroll-backend/`)

```
payroll-backend/
├── server.js                   # Main entry point
├── config.env                  # Environment variables
├── package.json
├── models/                     # MongoDB Mongoose models
│   ├── EmployeeModels.js       # Employee schema
│   ├── Attendance.model.js     # Attendance schema
│   ├── Deduction.model.js      # Deduction schema
│   ├── Payroll.model.js        # Payroll schema
│   └── SalaryModel.js          # Salary schema
├── routes/                     # API route definitions
│   ├── Employee.js             # Employee endpoints
│   ├── biometricRoutes_ipc.js  # Biometric operations
│   ├── fingerprint.routes.js   # Fingerprint management
│   ├── attendance.js           # Attendance endpoints
│   ├── deductionRouter.js      # Deduction endpoints
│   ├── payrollRouter.js        # Payroll endpoints
│   └── salaryRouter.js         # Salary endpoints
├── middleware/                 # Express middleware
│   ├── auth.js                 # JWT authentication
│   ├── validation.js           # Input validation
│   └── errorHandler.js         # Error handling
└── utils/                      # Helper functions

```

### Frontend (`employee/src/`)

```
src/
├── main.jsx                    # React entry point
├── App.jsx                     # Main app component with routing
├── index.css                   # Global styles
├── components/                 # React components
│   ├── Login.jsx               # Login page
│   ├── Dashboard_2.jsx         # Main dashboard
│   ├── Employee.jsx            # Employee management
│   ├── Attendance.jsx          # Attendance tracking
│   ├── Deductions.jsx          # Deductions management
│   ├── PayRoll.jsx             # Payroll processing
│   ├── Salary.jsx              # Salary management
│   ├── Layout.jsx              # Layout wrapper
│   └── BiometricLoginButton.jsx # Biometric auth button
├── services/                   # API service layer
│   ├── apiService.js           # Centralized API calls
│   ├── authService.js          # Authentication service
│   ├── biometricService.js     # Biometric operations
│   ├── employeeService.js      # Employee API calls
│   ├── deductionService.js     # Deduction API calls
│   └── payrollService.js       # Payroll API calls
├── config/                     # Configuration files
│   └── db.config.js            # Database config (not used in frontend)
└── assets/                     # Static assets (images, icons)

```

### Biometric Integration (`employee/Biometric_connect/`)

```
Biometric_connect/
├── main.py                              # GUI-based fingerprint enrollment
├── capture_fingerprint_ipc_complete.py  # IPC fingerprint capture & attendance
├── capture_fingerprint_ipc.py           # IPC fingerprint for login
├── attendance_gui.py                    # Attendance GUI
├── biometric_system_gui.py              # System GUI
└── test_*.py                            # Various test scripts

```

---

## 🔑 Environment Variables

### Backend (`payroll-backend/config.env`)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=90d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
API_BASE_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`.env` - if needed)

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_ENV=development
```

### Required Variables Validation

* Backend startup must validate:
  * `MONGODB_URI` - Database connection string.
  * `JWT_SECRET` - Token signing secret.
  * `PORT` - Server port (default: 5000).
* Missing variables must trigger immediate failure with clear error messages.

---

## 🛠️ Database Rules

### Database Configuration

* All queries must connect to MongoDB cloud database: `employee_db`.
* Connection must use Mongoose ODM.
* Connection pooling is handled automatically by Mongoose.
* Database credentials must come from environment variables.
* Fallback to local MongoDB: `mongodb://localhost:27017/employee_db` (development only).

### Schema Requirements

**Primary Collections:**
* `employees` - Employee records with fingerprint templates.
* `attendances` - Daily attendance logs.
* `deductions` - Employee deduction records.
* `payrolls` - Processed payroll data.
* `salaries` - Salary configuration per employee.

**Key Employee Schema Fields:**
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  contactNumber: String (required),
  employeeId: String (auto-generated if missing),
  status: 'regular' | 'oncall',
  position: String,
  hireDate: Date (required),
  username: String,
  password: String (hashed),
  isAdmin: Boolean,
  isActive: Boolean,
  fingerprintTemplate: String (base64 encoded),
  fingerprintEnrolled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Query Rules

* Parameterized queries must always be used (Mongoose handles this).
* Queries must filter inactive records where applicable: `{ isActive: true }`.
* Use `.populate()` for related documents (e.g., employee in attendance).
* Always use `.lean()` for read-only queries to improve performance.
* Indexes must be defined in schemas for frequently queried fields.

### Password Management

* Passwords must always be hashed using `bcryptjs` with salt rounds of 10.
* Never store plain-text passwords.
* Password validation must enforce:
  * Minimum 8 characters.
  * At least one uppercase letter.
  * At least one lowercase letter.
  * At least one number.

---

## 🔒 Authentication & Security

### JWT Authentication

* Tokens must be signed using `jsonwebtoken` with `JWT_SECRET`.
* Token expiration: 90 days (`JWT_EXPIRES_IN`).
* Tokens must be passed in `Authorization` header: `Bearer <token>`.
* Protected routes must use `auth` middleware.
* Admin routes must use `auth` followed by `adminAuth` middleware.

### Login Flow

1. User provides username/email and password, OR uses biometric.
2. Backend verifies credentials or fingerprint.
3. Backend generates JWT with payload: `{ id, username, isAdmin }`.
4. Frontend stores token in `localStorage`.
5. Frontend includes token in all API requests.

### Biometric Authentication

* Uses ZKTeco fingerprint scanner with `pyzkfp` library.
* Fingerprint enrollment stores base64-encoded template in `fingerprintTemplate` field.
* Biometric login flow:
  1. User scans fingerprint via `/api/biometric/login`.
  2. Python script captures fingerprint and queries MongoDB.
  3. Matching employee is returned with authentication token.
  4. Frontend stores token and redirects to dashboard.

### Security Best Practices

* Input must always be validated and sanitized.
* CORS must only allow trusted origins (`CORS_ORIGIN`).
* Rate limiting must be enforced (100 requests per 15 minutes per IP).
* Helmet.js must be used to secure HTTP headers.
* Never log sensitive data (passwords, tokens, fingerprint templates).
* Environment variables must never be committed to version control.

---

## 🖥️ Frontend Standards

### API Communication

* All API requests must pass through `services/apiService.js`.
* API base URL must be proxied through Vite: `/api` → `http://localhost:5000/api`.
* Use centralized API functions:
  ```javascript
  import { employeeApi, attendanceApi, deductionApi, payrollApi, salaryApi } from '../services/apiService';
  ```
* Handle errors gracefully with try-catch blocks.
* Display user-friendly error messages using toast notifications.

### State Management

* Authentication state must be managed using React Context (if implemented) or `localStorage`.
* Employee data should be fetched from API on component mount.
* Use React hooks: `useState`, `useEffect`, `useNavigate`, `useParams`.

### Protected Routes

* Routes requiring authentication must check for token in `localStorage`.
* If no token, redirect to login page.
* Admin-only routes must verify `isAdmin` flag.

### Component Best Practices

* Use functional components with hooks (no class components).
* Keep components focused on single responsibility.
* Extract reusable logic into custom hooks.
* Use TailwindCSS utility classes for styling.
* Avoid inline styles unless necessary for dynamic values.

### Event Bus Pattern

* Real-time updates use custom event emitter in `apiService.js`.
* Subscribe to events:
  ```javascript
  useEffect(() => {
    const handleUpdate = () => { /* refresh data */ };
    eventBus.on('employeeUpdate', handleUpdate);
    return () => eventBus.off('employeeUpdate', handleUpdate);
  }, []);
  ```
* Emit events after CRUD operations:
  ```javascript
  eventBus.emit('employeeUpdate');
  ```

---

## 📏 Coding Standards

### JavaScript/Node.js

* Use ES Modules (`import`/`export`) instead of CommonJS.
* Use `const` and `let` instead of `var`.
* Use `async/await` instead of chained promises.
* Use template literals instead of string concatenation.
* Use arrow functions for callbacks and short functions.
* Follow ESLint rules (configured in `eslint.config.js`).
* Use destructuring for objects and arrays.
* Use optional chaining (`?.`) and nullish coalescing (`??`).

### Python (Biometric Scripts)

* Use Python 3.x syntax.
* Use `pyzkfp` library for ZKTeco device communication.
* Use `pymongo` for MongoDB operations.
* Handle errors gracefully with try-except blocks.
* Return JSON responses for IPC communication.
* Log important events to stdout/stderr.

### Documentation

* All functions must have JSDoc comments describing purpose, parameters, and return values.
* Complex logic must have inline comments explaining the "why".
* API endpoints must be documented with example requests/responses.
* README files must be kept up-to-date with setup instructions.

---

## 🧪 Testing & QA

### Manual Testing

* Use Thunder Client, Postman, or Insomnia for API testing.
* Test all CRUD operations for each resource.
* Test authentication flow (login, protected routes).
* Test biometric enrollment and verification.
* Test error scenarios (invalid data, missing fields, unauthorized access).

### Test Files

* Backend test files: `test-*.js` (e.g., `test-db.js`, `test-login.js`).
* Python test files: `test_*.py` (e.g., `test_connection.py`, `test_device.py`).
* Run tests before deploying changes.

### Validation Checklist

- [ ] All required fields are validated.
- [ ] Duplicate entries are prevented (email, employeeId).
- [ ] Unauthorized access is blocked.
- [ ] Error messages are user-friendly.
- [ ] Sensitive data is not exposed.
- [ ] Database queries are optimized.
- [ ] Frontend displays data correctly.
- [ ] Real-time updates work as expected.

---

## 🚢 Deployment

### Development

* Frontend: `cd employee && npm run dev` (runs on port 5173).
* Backend: `cd employee/payroll-backend && npm run dev` (runs on port 5000).
* MongoDB: Cloud-hosted (MongoDB Atlas).

### Production

* Frontend build: `cd employee && npm run build`.
* Serve frontend build from backend (optional):
  ```javascript
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
  ```
* Use environment variable: `NODE_ENV=production`.
* Use strong `JWT_SECRET` and secure MongoDB credentials.
* Enable HTTPS (SSL/TLS) with reverse proxy (Nginx, Apache).
* Use process manager: PM2 or Docker.
* Set up monitoring and logging.

---

## 🔧 Common Issues & Fixes

### MongoDB Connection Issues

* **Symptom:** "MongoDB Connection Error" on server startup.
* **Fix:**
  1. Verify `MONGODB_URI` in `config.env`.
  2. Check MongoDB Atlas IP whitelist (allow your IP or `0.0.0.0/0` for testing).
  3. Ensure internet connection is stable.
  4. Test connection: `cd employee/payroll-backend && node test-db.js`.

### Biometric Device Not Detected

* **Symptom:** "No ZKTeco fingerprint devices found".
* **Fix:**
  1. Ensure ZKTeco device is connected via USB.
  2. Install ZKTeco drivers (Windows).
  3. Test device: `cd employee/Biometric_connect && py test_device.py`.
  4. Verify Python dependencies: `pip install pyzkfp pymongo`.

### Frontend API Calls Failing

* **Symptom:** "Failed to fetch" or CORS errors.
* **Fix:**
  1. Ensure backend is running on port 5000.
  2. Verify Vite proxy configuration in `vite.config.js`.
  3. Check `CORS_ORIGIN` in backend `config.env`.
  4. Inspect browser console for detailed errors.

### Duplicate Employees

* **Symptom:** Multiple employees with same email or employeeId.
* **Fix:**
  1. Add unique index to email field in Employee schema.
  2. Add validation in Employee route to check for duplicates before creating.
  3. Use `findOne()` to check if employee exists before insertion.

### Password Login Not Working

* **Symptom:** "Invalid credentials" even with correct password.
* **Fix:**
  1. Ensure password is hashed during employee creation.
  2. Use `bcrypt.compare()` to verify password (not direct comparison).
  3. Check if `isActive` field is `true`.
  4. Verify username/email format matches database.

### Attendance Not Recording

* **Symptom:** Biometric scan succeeds but no attendance record.
* **Fix:**
  1. Verify MongoDB connection in Python script.
  2. Check `MONGODB_URI` is passed to Python script via environment.
  3. Ensure `attendances` collection exists.
  4. Check Python script logs for errors.

---

## 🎯 Biometric Integration Specifics

### ZKTeco Device Communication

* **Library:** `pyzkfp` (ZKFP2).
* **Device Initialization:**
  ```python
  from pyzkfp import ZKFP2
  zkfp2 = ZKFP2()
  zkfp2.Init()
  device_count = zkfp2.GetDeviceCount()
  zkfp2.OpenDevice(0)  # Open first device
  ```
* **Fingerprint Capture:**
  ```python
  tmp, img = zkfp2.AcquireFingerprint()
  if tmp:
      # Process template
      regTmp, regTmpLen = zkfp2.DBMerge(*tmp)
  ```

### IPC (Inter-Process Communication)

* **Purpose:** Allow Python script to directly access MongoDB without going through Node.js.
* **Workflow:**
  1. Frontend/Backend spawns Python script via `child_process.spawn()`.
  2. Python script captures fingerprint.
  3. Python script queries MongoDB directly.
  4. Python script returns JSON response via stdout.
  5. Node.js parses JSON and sends to frontend.
* **Advantages:**
  * Faster response time (no HTTP overhead).
  * Direct database access from Python.
  * Simplified error handling.

### Fingerprint Enrollment Flow

1. Admin creates new employee via frontend.
2. Frontend calls `/api/employees` with employee data.
3. Backend generates temporary password and saves employee to MongoDB.
4. Backend spawns Python GUI (`main.py`) with employee data.
5. Python GUI captures 3 fingerprint scans and merges into template.
6. Python GUI sends template back to backend via callback endpoint.
7. Backend updates employee record with `fingerprintTemplate` and `fingerprintEnrolled: true`.
8. Employee can now use biometric login.

### Biometric Login Flow

1. User clicks "Login with Fingerprint" button.
2. Frontend calls `/api/biometric/login`.
3. Backend spawns Python script (`capture_fingerprint_ipc_complete.py --login`).
4. Python script prompts user to scan fingerprint.
5. Python script queries MongoDB for matching fingerprint template.
6. If match found, Python returns employee data.
7. Backend generates JWT and sends to frontend.
8. Frontend stores token and redirects to dashboard.

### Attendance Recording Flow

1. User scans fingerprint via `/api/biometric/connect`.
2. Backend spawns Python script (`capture_fingerprint_ipc_complete.py --direct`).
3. Python script captures fingerprint and matches against MongoDB.
4. Python script records attendance directly in `attendances` collection.
5. Python script returns success response.
6. Backend forwards response to frontend.

---

## ⚡ Non-Negotiable Rules

1. **Only `employee/payroll-backend/server.js` may act as backend entry point.**
2. **Duplicate files must be merged and removed before production deployment.**
3. **All connections must use MongoDB `employee_db` (cloud or local fallback).**
4. **Static data must never be used in production.**
5. **Security takes priority over consistency, which takes priority over performance, which takes priority over features.**
6. **Codebase must be scanned before creating new files to avoid duplication.**
7. **Biometric features must work seamlessly with ZKTeco device or gracefully degrade.**
8. **Passwords must always be hashed with bcrypt.**
9. **JWT tokens must be validated on all protected routes.**
10. **MongoDB connection must be established before server starts listening.**

---

## 📋 Development Workflow

### Before Starting Work

1. **Scan codebase:** Identify existing files and avoid duplication.
2. **Check TODO files:** Review pending tasks in `TODO_*.md` files.
3. **Verify environment:** Ensure `.env` and `config.env` are configured.
4. **Test connections:** Run `test-db.js` to verify MongoDB connection.

### During Development

1. **Follow naming conventions:** Use descriptive, consistent names.
2. **Write clean code:** Follow coding standards and best practices.
3. **Add logging:** Use `console.log()` for debugging (remove before production).
4. **Handle errors:** Use try-catch blocks and return meaningful error messages.
5. **Test incrementally:** Test each feature as you build it.

### Before Committing

1. **Remove duplicates:** Merge any duplicate files created during development.
2. **Update imports:** Ensure all imports reference the correct canonical files.
3. **Run tests:** Execute test files to verify functionality.
4. **Check for sensitive data:** Ensure no passwords, tokens, or secrets are hardcoded.
5. **Update documentation:** Update README or inline comments as needed.

### Deployment Checklist

- [ ] All duplicate files merged and removed.
- [ ] Environment variables configured for production.
- [ ] JWT_SECRET is strong and unique.
- [ ] MongoDB Atlas IP whitelist configured.
- [ ] Frontend build generated: `npm run build`.
- [ ] Backend starts without errors.
- [ ] Authentication flow tested.
- [ ] Biometric features tested with device.
- [ ] Error handling tested with invalid inputs.
- [ ] Logs reviewed for warnings or errors.

---

## 📚 Quick Reference

### Start Development Servers

```powershell
# Terminal 1: Backend
cd employee/payroll-backend
npm run dev

# Terminal 2: Frontend
cd employee
npm run dev
```

### Test Database Connection

```powershell
cd employee/payroll-backend
node test-db.js
```

### Test Biometric Device

```powershell
cd employee/Biometric_connect
py test_device.py
```

### Create Test Employee

```powershell
cd employee/payroll-backend
node create-test-employee.js
```

### Common API Endpoints

* `POST /api/employees/login` - Username/password login.
* `POST /api/biometric/login` - Biometric fingerprint login.
* `GET /api/employees` - Get all employees.
* `POST /api/employees` - Create new employee (triggers fingerprint enrollment).
* `POST /api/biometric/connect` - Record attendance via fingerprint.
* `GET /api/attendance` - Get attendance records.
* `POST /api/deductions` - Create deduction.
* `POST /api/payrolls` - Process payroll.
* `GET /api/salary` - Get salary records.

---

✅ **Final Reminder:**

* `server.js` is the single entry point for backend.
* `employee_db` (MongoDB) is the single source of truth.
* Biometric integration must work seamlessly with ZKTeco devices.
* File duplication is prohibited in production.
* Security and data integrity are paramount.
* **Workflow:** **scan → plan → implement → test → document → deploy**.

---

**End of Instructions**
