# MongoDB Configuration Guide

## Overview
Your application uses MongoDB Atlas for database storage. The connection is configured in the backend Express server.

## Current Configuration

### Backend Configuration
- **File**: `payroll-backend/config.env`
- **MongoDB URI**: `mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0`
- **Database**: `employee_db`

### Frontend Configuration
- **File**: `employee/.env`
- **API URL**: `http://localhost:5000/api`

## How to Test the Connection

### 1. Test Backend MongoDB Connection
```bash
cd employee/payroll-backend
node test-db.js
```

This will:
- ✅ Verify MongoDB connection
- 📊 Show database information
- 👥 Display employee count
- 📋 List available collections

### 2. Start the Backend Server
```bash
cd employee/payroll-backend
npm run dev
```

Expected output:
```
🚀 Server running on http://localhost:5000
MongoDB Connected Successfully
```

### 3. Start the Frontend
```bash
cd employee
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 300ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Environment Variables

### Backend (.env file)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=90d
```

### Frontend (.env file)
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_ENV=development
```

## Troubleshooting

### Connection Issues
1. **Check MongoDB Atlas**:
   - Ensure your IP address is whitelisted
   - Verify username/password are correct
   - Check if cluster is running

2. **Network Issues**:
   - Ensure internet connection is stable
   - Check firewall settings

3. **Environment Variables**:
   - Verify `config.env` exists in `payroll-backend/` directory
   - Check that `MONGODB_URI` is properly set

### Testing Commands
```bash
# Test MongoDB connection directly
cd employee/payroll-backend
node test-db.js

# Check if backend server starts
cd employee/payroll-backend
npm run dev

# Check if frontend builds
cd employee
npm run build
```

## Security Notes
- Never commit `.env` files to version control
- Use strong passwords for MongoDB Atlas
- Regularly rotate JWT secrets
- Use IP whitelisting in production
