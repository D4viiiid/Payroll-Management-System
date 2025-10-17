# Installation Guide — Attendance & Payroll Management System

This guide explains how to set up and run the project on different devices/environments: Windows (PowerShell), macOS/Linux (bash), Docker, and Raspberry Pi.

IMPORTANT: This repo currently contains third-party dependencies and virtualenv/site-packages. If you prefer a smaller repo, consider reverting the large commit and following the `requirements.txt` / `package.json` workflow instead.

Prerequisites (general)
- Git
- Node.js (16+ recommended) and npm or pnpm
- Python 3.10+ (if you need Python parts)
- MongoDB (local or remote Atlas) or another configured DB used by the project
- Docker & Docker Compose (optional, for containerized run)


## 1) Quick checklist
- Clone the repo
- Create `.env` files (copy from `.env.example` if present)
- Install server dependencies
- Install frontend dependencies
- Create and activate Python virtualenv (if needed)
- Start MongoDB or provide an Atlas URI


## 2) From source (recommended for development)

Notes: paths and commands assume you start from the repository root.

Windows (PowerShell)

```powershell
# Clone
git clone https://github.com/defnotwig/Attendance-and-Payroll-Management-System.git
cd Attendance-and-Payroll-Management-System

# Server
Set-Location .\server\server
npm install
# Create .env (example)
if(-not (Test-Path .env)){ Copy-Item .env.example .env -ErrorAction SilentlyContinue }
# Start server (example — confirm server entrypoint in server/server/package.json or server.js)
node server.js

# Frontend
Set-Location ..\..\employee
npm install
npm run dev

# Python (if required)
# Create venv
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r ..\requirements.txt
```

macOS / Linux (bash)

```bash
# Clone
git clone https://github.com/defnotwig/Attendance-and-Payroll-Management-System.git
cd Attendance-and-Payroll-Management-System

# Server
cd server/server
npm install
# copy .env.example to .env if needed
cp .env.example .env 2>/dev/null || true
node server.js &

# Frontend
cd ../../employee
npm install
npm run dev

# Python
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r ../requirements.txt
```


## 3) Docker (recommended for consistent environments)

If you want to run everything inside containers, create a `docker-compose.yml` at the repo root that starts MongoDB, the server, and the frontend. A minimal example (adjust service names, ports, and environment variables as required):

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:6
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
    ports:
      - '27017:27017'

  server:
    build: ./server/server
    working_dir: /app
    environment:
      - MONGO_URI=mongodb://mongo:27017/attendance
    ports:
      - '3000:3000'
    depends_on:
      - mongo

  frontend:
    build: ./employee
    working_dir: /app
    ports:
      - '5173:5173'
    depends_on:
      - server

volumes:
  mongo-data:
```

Then:

```bash
docker compose up --build
```

Adjust Dockerfiles in `server/server` and `employee` as needed — if they don't exist, I can generate simple Dockerfiles for Node + npm.


## 4) Raspberry Pi / ARM devices

- Use Node builds/versions compatible with ARM (install via nvm or the system package manager).
- Python venv works similarly (python3 -m venv .venv).
- Prefer Docker (ARM-compatible images) to avoid host-level quirks. If using Docker, ensure images match ARM architecture.


## 5) Environment variables
- Look for `.env.example` files in `server/server` and `employee` directories and copy them to `.env`.
- Typical variables:
  - MONGO_URI (mongodb://localhost:27017/attendance)
  - PORT (server port, e.g., 3000)
  - JWT_SECRET, EMAIL_HOST, EMAIL_USER, EMAIL_PASS


## 6) Verifying the install
- Server: curl http://localhost:3000/health or visit API base
- Frontend: open http://localhost:5173 (or the port reported by Vite)
- MongoDB: `mongo --eval "db.stats()"` or connect with MongoDB Compass


## 7) Troubleshooting
- If ports are in use, change `PORT` in `.env`.
- If Node fails with unsupported engine, install a compatible Node version (use nvm).
- If CORS or API 401 errors appear, confirm `.env` values and JWT secret match between services.


## 8) Reproducing the Python environment
- Use `requirements.txt` in the repo root to reinstall exact Python packages:

```bash
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
```


## 9) Security / cleanup recommendations
- Remove large vendor directories from history and add them to `.gitignore` (recommended). I can prepare a `git filter-repo` plan for this if you want.
- Run a secret-scan and remove any leaked credentials.


## 10) Need me to generate Dockerfiles or .env.example?
If you want, I can:
- Generate sensible `Dockerfile`s for `server/server` and `employee` and a `docker-compose.yml` tuned for this repo.
- Create `.env.example` templates with placeholder variables.


---

If this looks good, I'll commit `INSTALLATION.md` to the repo and push it. Let me know if you want me to add Dockerfiles and `.env.example` files too.