from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.orm import Session, selectinload, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.schemas.order import (
    OrderCreate,
    OrderStatusUpdate,
    OrderResponse,
)

router = APIRouter()


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout_cart(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """
    Convert the customer's current cart into an Order.
    Atomic Database Transaction:
    1. Verify cart is not empty.
    2. Validate each product is active and has sufficient stock.
    3. Atomically decrement inventory stock.
    4. Create Order and snapshot each OrderItem with unit_price & seller_id.
    5. Clear customer's cart items.
    6. Commit transaction; if any error occurs, cleanly rollback.
    """
    # 1. Retrieve user's cart with items and product details
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(selectinload(Cart.items).joinedload(CartItem.product))
    )

    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot checkout: your shopping cart is empty",
        )

    # 2. Validate all products in cart (active status & inventory stock)
    for item in cart.items:
        product = item.product
        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.title if product else item.product_id}' is no longer active or available",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.title}'. "
                    f"Requested: {item.quantity}, Available: {product.stock}"
                ),
            )

    try:
        # 3. Compute order total
        total_amount = round(
            sum(item.quantity * item.product.price for item in cart.items),
            2,
        )

        # 4. Create Order record
        order = Order(
            user_id=current_user.id,
            total_amount=total_amount,
            status=OrderStatus.PENDING,
            shipping_address=payload.shipping_address,
        )
        db.add(order)
        db.flush()  # Generates order.id for foreign keys in OrderItem

        # 5. Snapshot items into OrderItem & decrement inventory stock
        for item in cart.items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.product.price,  # Snapshots price at purchase moment
                seller_id=item.product.seller_id,
            )
            db.add(order_item)

            # Decrement stock atomically
            item.product.stock -= item.quantity

        # 6. Clear customer's cart items
        db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))

        # 7. Commit atomic transaction
        db.commit()

        # 8. Re-fetch order with eager-loaded items for clean response
        created_order = db.scalar(
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items).joinedload(OrderItem.product))
        )
        return created_order

    except Exception:
        db.rollback()
        raise


@router.get("/my-orders", response_model=list[OrderResponse])
def get_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """Retrieve the authenticated customer's order history."""
    orders = db.scalars(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.created_at.desc())
    ).all()
    return orders


@router.get("/seller/me", response_model=list[OrderResponse])
def get_seller_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Retrieve orders containing products belonging to the authenticated seller.
    Filters order items to only display items owned by this seller (unless Admin).
    """
    if current_user.role == UserRole.ADMIN:
        orders = db.scalars(
            select(Order)
            .options(selectinload(Order.items).joinedload(OrderItem.product))
            .order_by(Order.created_at.desc())
        ).all()
    else:
        orders = db.scalars(
            select(Order)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .where(OrderItem.seller_id == current_user.id)
            .distinct()
            .options(selectinload(Order.items).joinedload(OrderItem.product))
            .order_by(Order.created_at.desc())
        ).all()

    # Present orders with seller-specific items isolated
    result: list[OrderResponse] = []
    for order in orders:
        if current_user.role == UserRole.ADMIN:
            seller_items = order.items
        else:
            seller_items = [item for item in order.items if item.seller_id == current_user.id]

        result.append(
            OrderResponse(
                id=order.id,
                user_id=order.user_id,
                total_amount=order.total_amount,
                status=order.status,
                shipping_address=order.shipping_address,
                items=seller_items,
                created_at=order.created_at,
                updated_at=order.updated_at,
            )
        )
    return result


@router.get("/{id}", response_model=OrderResponse)
def get_order_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve single order details.
    Access Control:
    - Customer can only view their own order.
    - Seller can only view if the order contains their products.
    - Admin can view any order.
    """
    order = db.scalar(
        select(Order)
        .where(Order.id == id)
        .options(selectinload(Order.items).joinedload(OrderItem.product))
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {id} not found",
        )

    # RBAC & Ownership enforcement
    if current_user.role == UserRole.ADMIN:
        return order
    elif current_user.role == UserRole.CUSTOMER:
        if order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: you can only view your own orders",
            )
        return order
    elif current_user.role == UserRole.SELLER:
        has_seller_items = any(item.seller_id == current_user.id for item in order.items)
        if not has_seller_items:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: this order does not contain your products",
            )
        return order
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden",
        )


@router.patch("/{id}/status", response_model=OrderResponse)
def update_order_status(
    id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN])),
):
    """
    Update order status (e.g. PROCESSING, SHIPPED, DELIVERED, CANCELLED).
    - Sellers can update orders containing their products; Admins can update any.
    - If status is changed to CANCELLED, automatically replenishes deducted inventory stock.
    """
    order = db.scalar(
        select(Order)
        .where(Order.id == id)
        .options(selectinload(Order.items).joinedload(OrderItem.product))
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {id} not found",
        )

    # Check seller ownership if caller is a SELLER
    if current_user.role == UserRole.SELLER:
        has_seller_items = any(item.seller_id == current_user.id for item in order.items)
        if not has_seller_items:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: you can only update status for orders containing your products",
            )

    old_status = order.status
    new_status = payload.status

    if old_status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change status of an already CANCELLED order",
        )

    if old_status == OrderStatus.DELIVERED and new_status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an order that has already been delivered",
        )

    # Automatic Stock Replenishment on Cancellation
    if old_status != OrderStatus.CANCELLED and new_status == OrderStatus.CANCELLED:
        for item in order.items:
            if item.product:
                item.product.stock += item.quantity

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order
