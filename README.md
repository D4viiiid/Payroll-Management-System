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

Recreating the Python virtual environment (recommended)

If you need to run Python parts of the project, we intentionally do not track the `.venv/` directory. Instead recreate a clean venv and install pinned dependencies from `requirements.txt`:

```powershell
# create venv (Windows PowerShell)
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

Why `.venv` is excluded
- Committing `site-packages` inflates the repository and often contains platform-specific binaries; excluding the venv keeps the repo small and portable. Use `requirements.txt` to reproduce the environment.

<!-- Force rebuild 10/23/2025 11:39:19 -->
