from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect

from app.core.config import settings
from app.core.database import engine, Base, get_db
import app.models  # Ensures models are registered with Base metadata
from app.routers import auth, categories, products, cart, orders, payments, wishlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Auto-create database tables on startup (SQLite & PostgreSQL)
    Base.metadata.create_all(bind=engine)

    # 2. Schema compatibility check for existing databases
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            order_cols = [c["name"] for c in inspector.get_columns("orders")]
            if "razorpay_order_id" not in order_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(100)"))
            if "razorpay_payment_id" not in order_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(100)"))
            conn.commit()
    except Exception:
        pass

    # 3. Auto-seed initial demo and PDF assessment test users
    try:
        from sqlalchemy import select
        from app.core.database import SessionLocal
        from app.core.security import get_password_hash
        from app.models.user import User, UserRole

        with SessionLocal() as db:
            seed_accounts = [
                # Assessment test credentials
                ("admin@example.com", "Admin User", UserRole.ADMIN),
                ("sales@example.com", "Sales User", UserRole.SELLER),
                ("user@example.com", "Standard Customer", UserRole.CUSTOMER),
                # Demo accounts
                ("admin@demo.com", "Platform Admin", UserRole.ADMIN),
                ("seller@demo.com", "Demo Seller", UserRole.SELLER),
                ("customer@demo.com", "Demo Customer", UserRole.CUSTOMER),
            ]
            for email, full_name, role in seed_accounts:
                exists = db.scalar(select(User.id).where(User.email == email))
                if not exists:
                    db.add(
                        User(
                            email=email,
                            hashed_password=get_password_hash("password123"),
                            full_name=full_name,
                            role=role,
                        )
                    )
            db.commit()
    except Exception as e:
        print(f"Startup user seeding skipped: {e}")

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


# Register API Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(cart.router, prefix="/api/cart", tags=["Cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(wishlist.router, prefix="/api/wishlist", tags=["Wishlist"])


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
