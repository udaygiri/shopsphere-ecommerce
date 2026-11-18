import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter()


def generate_slug(text: str) -> str:
    """Generate a clean URL-friendly slug from text."""
    slug = text.strip().lower()
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Public endpoint: Retrieve all product categories ordered alphabetically."""
    categories = db.scalars(select(Category).order_by(Category.name.asc())).all()
    return categories


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Seller and Admin endpoint: Create a new product category.
    Generates slug automatically if not provided.
    """
    clean_name = category_in.name.strip()
    slug = generate_slug(category_in.slug) if category_in.slug else generate_slug(clean_name)

    if not slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name must contain valid alphanumeric characters for slug",
        )

    # Check for duplicate name or slug
    existing = db.scalar(
        select(Category).where((Category.name.ilike(clean_name)) | (Category.slug == slug))
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with name '{clean_name}' or slug '{slug}' already exists",
        )

    category = Category(name=clean_name, slug=slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
