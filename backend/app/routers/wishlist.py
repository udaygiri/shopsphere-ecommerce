from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import WishlistItemResponse

router = APIRouter()


@router.get("", response_model=list[WishlistItemResponse])
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """Retrieve all saved wishlist items for the authenticated user."""
    items = db.scalars(
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .order_by(WishlistItem.created_at.desc())
    ).all()
    return items


@router.post("/{product_id}", response_model=WishlistItemResponse)
def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """
    Add a product to user's wishlist.
    - Validates product existence.
    - Prevents duplicate entries by returning the existing record if already saved.
    """
    product = db.scalar(select(Product).where(Product.id == product_id))
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )

    existing = db.scalar(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    if existing:
        return existing

    item = WishlistItem(user_id=current_user.id, product_id=product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """Remove a product from user's wishlist."""
    item = db.scalar(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found in your wishlist",
        )

    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
