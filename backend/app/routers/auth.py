from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.auth import Token

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with hashed password."""
    existing_user = db.scalar(select(User).where(User.email == user_in.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=Token,
    summary="Authenticate and receive JWT access token",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning a signed JWT access token."""
    user = db.scalar(select(User).where(User.email == credentials.email))
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    """Protected endpoint returning the profile of the current authenticated user."""
    return current_user


@router.get(
    "/admin-only",
    response_model=UserResponse,
    summary="Admin-only test endpoint to verify RBAC",
)
def admin_only_check(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    """Endpoint accessible strictly by ADMIN role."""
    return current_user
