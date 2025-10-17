# Attendance & Payroll Management System

This repository contains an attendance and payroll management system, including frontend (React/Vite) and backend (Node/Express) components, scripts, and extensive documentation.

Contents
- `employee/` — frontend and some backend code for the employee UI and payroll integration.
- `server/` — backend server code and API routes.
- Docs and reports — numerous markdown reports and test scripts used during development and QA.

Quick start (development)

1. Install dependencies for server and frontend as needed (check `employee/package.json` and `server/server/package.json`).

2. Example (PowerShell):

```powershell
# from repo root
Set-Location .\employee
npm install
npm run dev

# in another terminal for server
Set-Location ..\server\server
npm install
node server.js
```

Notes
- Sensitive files like `.env` and database files are in `.gitignore` — add your own environment variables before running.
- If you see CRLF warnings, they are normal on Windows; consider setting core.autocrlf if needed.

License & Contribution
- Add a license and contribution guidelines as appropriate.
