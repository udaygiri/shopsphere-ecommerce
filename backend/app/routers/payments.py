import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.orm import Session, selectinload, joinedload

from app.core.database import get_db
from app.core.deps import require_role
from app.core.razorpay import razorpay_service
from app.models.user import User, UserRole
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)

router = APIRouter()


@router.get("/config")
def get_payment_config():
    """
    Returns public Razorpay configuration for frontend modal initialization.
    """
    return {
        "key_id": razorpay_service.public_key_id,
        "is_mock": razorpay_service.is_mock_mode,
        "currency": "INR",
    }


@router.post(
    "/create-order",
    response_model=PaymentOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_order(
    payload: PaymentOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """
    Initiates payment lifecycle:
    1. Validates that the customer's cart contains items.
    2. Validates live stock and active status for each cart product.
    3. Calculates cart total in INR and converts to paise (1 INR = 100 paise).
    4. Creates an order with Razorpay (or mock fallback if credentials are placeholder).
    5. Returns order details and public key to frontend for modal launch.
    """
    # 1. Retrieve customer's cart with items and products
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(selectinload(Cart.items).joinedload(CartItem.product))
    )

    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create payment order: your shopping cart is empty",
        )

    # 2. Validate live stock and availability
    for item in cart.items:
        product = item.product
        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.title if product else item.product_id}' is no longer active",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.title}'. "
                    f"Requested: {item.quantity}, Available: {product.stock}"
                ),
            )

    # 3. Calculate total amount in INR and paise
    total_amount = round(
        sum(item.quantity * item.product.price for item in cart.items),
        2,
    )
    amount_in_paise = razorpay_service.rupees_to_paise(total_amount)

    # 4. Generate Razorpay Order
    receipt_id = f"rcpt_{current_user.id}_{int(time.time())}"
    rzp_order = razorpay_service.create_order(
        amount_in_paise=amount_in_paise,
        currency="INR",
        receipt=receipt_id,
        notes={
            "user_id": str(current_user.id),
            "shipping_address": payload.shipping_address,
        },
    )

    return PaymentOrderResponse(
        razorpay_order_id=rzp_order["id"],
        amount=amount_in_paise,
        currency="INR",
        key_id=razorpay_service.public_key_id,
        amount_in_rupees=total_amount,
        shipping_address=payload.shipping_address,
        customer_name=current_user.full_name,
        customer_email=current_user.email,
        is_mock=razorpay_service.is_mock_mode,
    )


@router.post("/verify", response_model=PaymentVerifyResponse)
def verify_payment(
    payload: PaymentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.CUSTOMER, UserRole.ADMIN])),
):
    """
    Cryptographically verifies the Razorpay signature and executes atomic checkout:
    1. Validates HMAC-SHA256 signature using the secret key.
       - If forged or mismatched: cleanly rejects with 400 Bad Request.
    2. Checks idempotency: if payment has already been recorded, returns existing order.
    3. Validates current cart and real-time inventory.
    4. Atomic Transaction:
       - Decrements product inventory stock.
       - Snapshots unit prices into OrderItem records.
       - Creates/updates Order with status=PROCESSING and razorpay_payment_id.
       - Clears customer's shopping cart.
       - Commits transaction; cleanly rolls back on any error without touching stock.
    """
    # 1. Cryptographic HMAC-SHA256 signature verification
    is_valid = razorpay_service.verify_payment_signature(
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid or forged cryptographic signature",
        )

    # 2. Idempotency check: has this payment ID already completed an order?
    existing_order = db.scalar(
        select(Order)
        .where(Order.razorpay_payment_id == payload.razorpay_payment_id)
        .options(selectinload(Order.items).joinedload(OrderItem.product))
    )
    if existing_order:
        return PaymentVerifyResponse(
            success=True,
            message="Payment was already processed successfully",
            order=existing_order,
        )

    # 3. Retrieve user's cart
    cart = db.scalar(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(selectinload(Cart.items).joinedload(CartItem.product))
    )
    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shopping cart is empty. Cannot complete order fulfillment.",
        )

    # 4. Final real-time stock and active validation
    for item in cart.items:
        product = item.product
        if not product or not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.title if product else item.product_id}' is no longer active",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.title}'. "
                    f"Requested: {item.quantity}, Available: {product.stock}"
                ),
            )

    # 5. Atomic Checkout Execution
    try:
        total_amount = round(
            sum(item.quantity * item.product.price for item in cart.items),
            2,
        )
        shipping_addr = (payload.shipping_address or "").strip()
        if len(shipping_addr) < 10:
            shipping_addr = "Standard Verified Delivery Address"

        # Check if a pending order record already exists for this razorpay_order_id
        order = db.scalar(
            select(Order).where(
                Order.razorpay_order_id == payload.razorpay_order_id,
                Order.user_id == current_user.id,
            )
        )

        if not order:
            order = Order(
                user_id=current_user.id,
                total_amount=total_amount,
                status=OrderStatus.PROCESSING,
                shipping_address=shipping_addr,
                razorpay_order_id=payload.razorpay_order_id,
                razorpay_payment_id=payload.razorpay_payment_id,
            )
            db.add(order)
            db.flush()
        else:
            order.status = OrderStatus.PROCESSING
            order.razorpay_payment_id = payload.razorpay_payment_id
            order.total_amount = total_amount
            if shipping_addr:
                order.shipping_address = shipping_addr

        # Snapshot cart items into OrderItem & decrement inventory stock
        for item in cart.items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.product.price,  # Snapshots price at purchase moment
                seller_id=item.product.seller_id,
            )
            db.add(order_item)

            # Atomically decrement inventory stock
            item.product.stock -= item.quantity

        # Clear customer's cart
        db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))

        # Commit transaction
        db.commit()

        # Re-fetch order with eager relationships
        completed_order = db.scalar(
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.items).joinedload(OrderItem.product))
        )

        return PaymentVerifyResponse(
            success=True,
            message="Payment verified successfully and order placed",
            order=completed_order,
        )

    except Exception:
        db.rollback()
        raise
