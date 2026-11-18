from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select, delete
from sqlalchemy.orm import Session, selectinload, joinedload

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.cart import Cart, CartItem
from app.schemas.cart import (
    CartItemAdd,
    CartItemUpdate,
    CartResponse,
)

router = APIRouter()


def get_user_cart(user_id: int, db: Session) -> Cart:
    """Helper to fetch or create a user's cart with items and product details loaded."""
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items).joinedload(CartItem.product))
    )
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        cart = db.scalar(
            select(Cart)
            .where(Cart.user_id == user_id)
            .options(selectinload(Cart.items).joinedload(CartItem.product))
        )
    return cart


@router.get("", response_model=CartResponse)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """Retrieve the current user's shopping cart with computed subtotals and product availability."""
    return get_user_cart(current_user.id, db)


@router.post("/items", response_model=CartResponse)
def add_item_to_cart(
    payload: CartItemAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """
    Add a product to the user's cart.
    - If product already exists in cart, increment quantity.
    - Validates product active status and stock availability.
    """
    # 1. Validate product exists and is active
    product = db.scalar(select(Product).where(Product.id == payload.product_id))
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {payload.product_id} not found",
        )
    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{product.title}' is currently inactive and cannot be added to cart",
        )
    if product.stock <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{product.title}' is out of stock",
        )

    # 2. Retrieve or create user's cart
    cart = get_user_cart(current_user.id, db)

    # 3. Check if product already exists in this cart
    cart_item = db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.product_id == payload.product_id,
        )
    )

    if cart_item:
        new_quantity = cart_item.quantity + payload.quantity
        if new_quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Requested total quantity ({new_quantity}) exceeds available stock "
                    f"({product.stock}) for '{product.title}'"
                ),
            )
        cart_item.quantity = new_quantity
    else:
        if payload.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Requested quantity ({payload.quantity}) exceeds available stock "
                    f"({product.stock}) for '{product.title}'"
                ),
            )
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(cart_item)

    db.commit()
    return get_user_cart(current_user.id, db)


@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """
    Update quantity of a specific cart item.
    - Ensures item belongs to the caller's cart.
    - Validates requested quantity against current stock.
    """
    cart = get_user_cart(current_user.id, db)
    cart_item = db.scalar(
        select(CartItem)
        .where(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id,
        )
        .options(joinedload(CartItem.product))
    )
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cart item with ID {item_id} not found in your cart",
        )

    if not cart_item.product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{cart_item.product.title}' is no longer active",
        )

    if payload.quantity > cart_item.product.stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Requested quantity ({payload.quantity}) exceeds available stock "
                f"({cart_item.product.stock}) for '{cart_item.product.title}'"
            ),
        )

    cart_item.quantity = payload.quantity
    db.commit()
    return get_user_cart(current_user.id, db)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """Remove a specific item from the user's cart."""
    cart = get_user_cart(current_user.id, db)
    cart_item = db.scalar(
        select(CartItem).where(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id,
        )
    )
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cart item with ID {item_id} not found in your cart",
        )

    db.delete(cart_item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """Clear all items from the current user's cart."""
    cart = get_user_cart(current_user.id, db)
    db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
