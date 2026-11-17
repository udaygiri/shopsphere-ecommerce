# Role-Based E-Commerce Platform

A full-stack role-based e-commerce application built with **FastAPI** (Python) and **React.js** (Vite). Designed for an internship assessment, following clean code practices, clear separation of concerns, and practical full-stack patterns.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python 3.12+), SQLAlchemy 2.0, Alembic, Pydantic v2, Uvicorn
- **Frontend:** React.js (Vite, CSS Modules / Modern CSS)
- **Database:** SQLite (local development), PostgreSQL (production)
- **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)
- **Third-Party Services:**
  - **Cloudinary:** Media/image upload and management
  - **Razorpay:** Payment gateway integration (Test mode)

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI application entrypoint & healthcheck
│   ├── pyproject.toml       # uv project dependencies & configuration
│   ├── uv.lock              # Reproducible dependency lockfile
│   ├── requirements.txt     # Standard requirements reference
│   └── .env.example         # Backend environment variables template
├── frontend/
│   ├── public/              # Static public assets
│   ├── src/                 # React source code (components, pages, styles)
│   ├── package.json         # Node.js dependencies & scripts
│   ├── vite.config.js       # Vite build configuration
│   └── .env.example         # Frontend environment variables template
├── .env.example             # Combined environment variable references
├── .gitignore               # Ignored files (node_modules, .venv, .env, etc.)
└── README.md                # Project documentation
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.12+ and `uv` (fast Python package manager)
- Node.js 18+ and `npm`

### 2. Backend Setup (Powered by uv)
```bash
# Navigate to backend
cd backend

# Create your .env file
cp .env.example .env

# Sync dependencies using uv
uv sync

# Run FastAPI dev server directly with uv
uv run uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/api/health`

> **Note on exFAT Drive:** `UV_PROJECT_ENVIRONMENT=/home/bapu/.venvs/ecommerce-backend` is configured in your shell profile so `uv run`, `uv add`, and `uv sync` manage the environment seamlessly without symlink errors.

### 3. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env

# Start Vite dev server
npm run dev
```
- Frontend UI: `http://localhost:5173`

---

## 🔒 Security & Best Practices
- Passwords hashed using `bcrypt`
- Role-based route guards on both frontend and backend
- Secret keys and API credentials managed securely via `.env`
