from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, Base, get_db
import app.models  # Ensures models are registered with Base metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (convenient for local dev & SQLite)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Backend API for Role-Based E-Commerce Platform",
    lifespan=lifespan,
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/api/health",
        "db_check": "/api/db-check",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "backend"}


@app.get("/api/db-check")
def db_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {
        "status": "connected",
        "database": "sqlite" if "sqlite" in engine.url.drivername else "postgresql",
        "message": "Database tables verified and connection active",
    }
