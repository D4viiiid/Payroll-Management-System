# Contributing / Developer Setup

Thanks for contributing! This document describes how to get the project running locally and the recommended workflow.

## Overview
This repository contains a frontend (under `employee/`), a backend (`server/server`) and Python helper scripts (under `employee/Biometric_connect`).

## Prerequisites
- Windows (PowerShell) or any OS with Node.js and Python
- Node.js (>=18 recommended) and npm
- Python 3.11+ (for the Python helper scripts)
- Git

## Quick setup (PowerShell)
1. Clone the repo:

```powershell
git clone https://github.com/defnotwig/Attendance-and-Payroll-Management-System.git
Set-Location Attendance-and-Payroll-Management-System
```

2. Create Python venv and install dependencies:

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

3. Install frontend dependencies and run dev server (in separate terminal):

```powershell
# frontend
Set-Location .\employee
npm install
npm run dev
```

4. Install backend dependencies and run server:

```powershell
# backend (server/server)
Set-Location ..\server\server
npm install
node server.js
```

## Environment variables
- Copy example env files (if present) and set local secrets. Sensitive files like `.env` and database files are ignored by `.gitignore`. Do not commit secrets.

## Database
- This repo may reference local DB files (fingerprint DB) used for testing. Do not commit production DB files.

## Git workflow
- Create feature branches off `main`:

```powershell
git checkout -b feat/describe-feature
# work, add, commit
git push -u origin feat/describe-feature
```

- Open a pull request into `main` when ready. Keep commits small and write clear commit messages.

## Tests & linting
- Frontend and backend may have npm scripts for linting and tests (`employee/package.json`, `server/server/package.json`). Run appropriate scripts locally.

## Notes for maintainers
- `.venv` is intentionally excluded; use `requirements.txt` to reproduce Python dependencies.
- Consider using CI (GitHub Actions) to run tests and linting on PRs.

If anything is missing or specific scripts are needed, open an issue or PR with the requested addition.
