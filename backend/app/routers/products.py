from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Seller Management Route (Must be declared BEFORE /{id} to avoid collision)
# -----------------------------------------------------------------------------
@router.get("/seller/me", response_model=list[ProductResponse])
def get_my_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Seller/Admin dashboard endpoint:
    Returns all products owned by the currently authenticated seller.
    Admins calling this endpoint see products where they are recorded as the seller.
    """
    products = db.scalars(
        select(Product)
        .where(Product.seller_id == current_user.id)
        .order_by(Product.created_at.desc())
    ).all()
    return products


# -----------------------------------------------------------------------------
# 2. Public Storefront Catalog (Browse, Filter, Search, Paginate)
# -----------------------------------------------------------------------------
@router.get("", response_model=list[ProductResponse])
def get_products(
    category_id: int | None = Query(None, description="Filter products by Category ID"),
    search: str | None = Query(None, description="Search keyword in title or description"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to fetch (max 100)"),
    db: Session = Depends(get_db),
):
    """
    Public storefront endpoint:
    Lists active products with optional category filtering, case-insensitive keyword search,
    and offset pagination.
    """
    stmt = select(Product).where(Product.is_active == True)

    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)

    if search:
        search_filter = f"%{search.strip()}%"
        stmt = stmt.where(
            (Product.title.ilike(search_filter)) | (Product.description.ilike(search_filter))
        )

    stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    products = db.scalars(stmt).all()
    return products


# -----------------------------------------------------------------------------
# 3. Public Single Product Details
# -----------------------------------------------------------------------------
@router.get("/{id}", response_model=ProductResponse)
def get_product(
    id: int,
    db: Session = Depends(get_db),
):
    """Public endpoint: Retrieve single product details by product ID."""
    product = db.scalar(select(Product).where(Product.id == id))
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product


# -----------------------------------------------------------------------------
# 4. Create Product (Seller / Admin Only)
# -----------------------------------------------------------------------------
@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Seller/Admin endpoint: Create a new product.
    Automatically assigns seller_id to current_user.id.
    """
    # Verify target category exists
    category = db.scalar(select(Category).where(Category.id == product_in.category_id))
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {product_in.category_id} not found",
        )

    product = Product(
        **product_in.model_dump(),
        seller_id=current_user.id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


# -----------------------------------------------------------------------------
# 5. Update Product (Owner Seller or Admin Only)
# -----------------------------------------------------------------------------
@router.put("/{id}", response_model=ProductResponse)
def update_product(
    id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Seller/Admin endpoint: Update an existing product.
    - Sellers can only edit products they own.
    - Admins can edit any product.
    """
    product = db.scalar(select(Product).where(Product.id == id))
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Ownership check: Admin can edit any, seller can only edit their own
    if current_user.role != UserRole.ADMIN and product.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this product",
        )

    # If category_id is being updated, verify new category exists
    if product_in.category_id is not None:
        category = db.scalar(select(Category).where(Category.id == product_in.category_id))
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with id {product_in.category_id} not found",
            )

    update_data = product_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


# -----------------------------------------------------------------------------
# 6. Delete Product (Owner Seller or Admin Only)
# -----------------------------------------------------------------------------
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Seller/Admin endpoint: Delete a product.
    - Sellers can only delete products they own.
    - Admins can delete any product.
    """
    product = db.scalar(select(Product).where(Product.id == id))
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Ownership check: Admin can delete any, seller can only delete their own
    if current_user.role != UserRole.ADMIN and product.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this product",
        )

    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
