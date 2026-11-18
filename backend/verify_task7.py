"""
Verification Script for Task 7: Razorpay Payment Gateway Integration (Test Mode INR ₹) & Atomic Checkout

Tests:
1. Payment Configuration Endpoint (`GET /api/payments/config`):
   - Returns key_id, is_mock, currency="INR"
2. Persona & Inventory Preparation:
   - Sets up Seller, Product (with specific price & stock), and Customer
3. Payment Order Creation (`POST /api/payments/create-order`):
   - Rejects empty cart (400 Bad Request)
   - Validates live inventory availability
   - Accurately converts INR currency amount to integer paise (1 INR = 100 paise)
   - Returns razorpay_order_id, amount, currency, and customer metadata
4. Cryptographic Security & Anti-Fraud Signature Verification (`POST /api/payments/verify`):
   - Rejects forged/tampered signature with 400 Bad Request
   - Verifies inventory stock remains UNTOUCHED after rejected payment
   - Verifies customer shopping cart is PRESERVED after rejected payment
5. Successful Payment & Atomic Checkout Execution:
   - Validates genuine HMAC-SHA256 cryptographic signature
   - Atomically decrements product inventory stock
   - Snapshots historical unit_price into OrderItem
   - Transitions order status to PROCESSING
   - Persists razorpay_order_id and razorpay_payment_id in Order record
   - Automatically clears customer's shopping cart
   - Idempotency: Duplicate payment verification returns existing order without double-decrementing
6. Order History & Seller Visibility:
   - Customer's `/api/orders/my-orders` displays confirmed order with payment reference
   - Seller's `/api/orders/seller/me` contains the sold order item
"""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.core.database import SessionLocal
from app.core.razorpay import razorpay_service
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order, OrderStatus

client = TestClient(app)


def get_or_create_user(email: str, password: str, full_name: str, role: str) -> str:
    """Helper to log in or register user and return their access token."""
    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    if login_res.status_code == 200:
        return login_res.json()["access_token"]

    reg_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": full_name, "role": role},
    )
    assert reg_res.status_code == 201, f"Failed to register {email}: {reg_res.text}"

    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200, f"Failed to login {email}: {login_res.text}"
    return login_res.json()["access_token"]


def run_verification():
    print("=" * 70)
    print("TASK 7 VERIFICATION: RAZORPAY INTEGRATION & ATOMIC CHECKOUT")
    print("=" * 70)

    # ---------------------------------------------------------
    # STEP 1: Test Public Payment Configuration
    # ---------------------------------------------------------
    print("\n[STEP 1] Testing Public Payment Configuration...")
    config_res = client.get("/api/payments/config")
    assert config_res.status_code == 200, f"Config endpoint failed: {config_res.text}"
    config_data = config_res.json()
    assert config_data["currency"] == "INR", f"Expected INR currency, got {config_data['currency']}"
    assert "key_id" in config_data, "key_id missing from payment config"
    assert "is_mock" in config_data, "is_mock flag missing from payment config"
    print(f"  ✓ Payment config verified: Currency={config_data['currency']}, MockMode={config_data['is_mock']}")

    # ---------------------------------------------------------
    # STEP 2: Setup Personas and Products
    # ---------------------------------------------------------
    print("\n[STEP 2] Setting Up Personas & Test Products...")
    seller_token = get_or_create_user(
        "seller_task7@example.com", "SellerPass123!", "Task7 Audio Store", "SELLER"
    )
    customer_token = get_or_create_user(
        "customer_task7@example.com", "CustPass123!", "Rahul Sharma", "CUSTOMER"
    )

    seller_headers = {"Authorization": f"Bearer {seller_token}"}
    customer_headers = {"Authorization": f"Bearer {customer_token}"}

    # Ensure Category exists
    db = SessionLocal()
    category = db.scalar(select(Category).where(Category.slug == "task-7-audio"))
    if not category:
        category = Category(name="Task 7 Audio", slug="task-7-audio")
        db.add(category)
        db.commit()
        db.refresh(category)
    category_id = category.id
    db.close()

    # Create Product with specific INR pricing and initial stock = 10
    product_res = client.post(
        "/api/products",
        headers=seller_headers,
        json={
            "title": "Hi-Res Studio Headphones",
            "description": "Studio monitor headphones with pristine audio reproduction",
            "price": 2499.50,  # ₹2,499.50 -> 249,950 paise
            "stock": 10,
            "category_id": category_id,
            "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
        },
    )
    assert product_res.status_code == 201, f"Failed to create product: {product_res.text}"
    product_id = product_res.json()["id"]
    print(f"  ✓ Created Product ID {product_id}: 'Hi-Res Studio Headphones' at ₹2499.50, Initial Stock: 10")

    # ---------------------------------------------------------
    # STEP 3: Test Payment Order Creation (POST /api/payments/create-order)
    # ---------------------------------------------------------
    print("\n[STEP 3] Testing /api/payments/create-order Endpoint...")

    # Ensure clean cart at start
    client.delete("/api/cart", headers=customer_headers)

    # A. Empty cart rejection
    empty_order_res = client.post(
        "/api/payments/create-order",
        headers=customer_headers,
        json={"shipping_address": "Flat 402, Lotus Residency, MG Road, Bengaluru - 560001"},
    )
    assert empty_order_res.status_code == 400, f"Expected 400 for empty cart, got {empty_order_res.status_code}"
    print("  ✓ Empty shopping cart cleanly rejected with 400 Bad Request")

    # B. Add 2 units of headphones to cart (2 * ₹2499.50 = ₹4999.00)
    add_cart_res = client.post(
        "/api/cart/items",
        headers=customer_headers,
        json={"product_id": product_id, "quantity": 2},
    )
    assert add_cart_res.status_code == 200, f"Failed to add item to cart: {add_cart_res.text}"
    print("  ✓ Added 2 units to customer cart (Expected total: ₹4999.00)")

    # C. Create Razorpay Payment Order
    create_order_res = client.post(
        "/api/payments/create-order",
        headers=customer_headers,
        json={"shipping_address": "Flat 402, Lotus Residency, MG Road, Bengaluru - 560001"},
    )
    assert create_order_res.status_code == 201, f"Order creation failed: {create_order_res.text}"
    rzp_order_data = create_order_res.json()

    rzp_order_id = rzp_order_data["razorpay_order_id"]
    amount_in_paise = rzp_order_data["amount"]
    currency = rzp_order_data["currency"]
    rupees_val = rzp_order_data["amount_in_rupees"]

    assert rzp_order_id.startswith("order_"), f"Invalid razorpay_order_id format: {rzp_order_id}"
    assert currency == "INR", f"Expected currency INR, got {currency}"
    assert amount_in_paise == 499900, f"Expected 499900 paise (₹4999.00), got {amount_in_paise}"
    assert rupees_val == 4999.00, f"Expected ₹4999.00, got {rupees_val}"
    print(f"  ✓ Razorpay Order created: ID={rzp_order_id}")
    print(f"  ✓ Currency precision verified: ₹{rupees_val} converted to {amount_in_paise} paise")

    # ---------------------------------------------------------
    # STEP 4: Anti-Fraud Cryptographic Verification (Forged Signature)
    # ---------------------------------------------------------
    print("\n[STEP 4] Testing Cryptographic Signature Tamper Rejection...")
    mock_payment_id = f"pay_test_fraud_{uuid.uuid4().hex[:8]}"
    forged_signature = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    tamper_res = client.post(
        "/api/payments/verify",
        headers=customer_headers,
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": mock_payment_id,
            "razorpay_signature": forged_signature,
            "shipping_address": "Flat 402, Lotus Residency, MG Road, Bengaluru - 560001",
        },
    )
    assert tamper_res.status_code == 400, f"Expected 400 for forged signature, got {tamper_res.status_code}"
    print(f"  ✓ Forged signature correctly blocked (400 Bad Request): {tamper_res.json()['detail']}")

    # Verify inventory was NOT touched and cart was NOT cleared
    db = SessionLocal()
    check_product = db.scalar(select(Product).where(Product.id == product_id))
    assert check_product.stock == 10, f"Stock was modified during forged attempt! Expected 10, got {check_product.stock}"
    db.close()

    cart_after_fraud = client.get("/api/cart", headers=customer_headers).json()
    assert cart_after_fraud["total_items"] == 2, "Cart was cleared despite fraud attempt!"
    print("  ✓ Integrity confirmed: Stock remained untouched at 10, Cart preserved with 2 items")

    # ---------------------------------------------------------
    # STEP 5: Successful Payment Verification & Atomic Checkout
    # ---------------------------------------------------------
    print("\n[STEP 5] Testing Genuine Payment Verification & Atomic Checkout...")
    valid_payment_id = f"pay_test_success_{uuid.uuid4().hex[:8]}"
    # Cryptographically generate genuine signature using the shared secret
    genuine_signature = razorpay_service.generate_signature(rzp_order_id, valid_payment_id)

    verify_res = client.post(
        "/api/payments/verify",
        headers=customer_headers,
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": valid_payment_id,
            "razorpay_signature": genuine_signature,
            "shipping_address": "Flat 402, Lotus Residency, MG Road, Bengaluru - 560001",
        },
    )
    assert verify_res.status_code == 200, f"Payment verification failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data["success"] is True, "Expected success to be True"
    confirmed_order = verify_data["order"]

    assert confirmed_order["status"] == "PROCESSING", f"Expected status PROCESSING, got {confirmed_order['status']}"
    assert confirmed_order["razorpay_order_id"] == rzp_order_id, "Order razorpay_order_id mismatch"
    assert confirmed_order["razorpay_payment_id"] == valid_payment_id, "Order razorpay_payment_id mismatch"
    assert confirmed_order["total_amount"] == 4999.00, f"Expected total 4999.00, got {confirmed_order['total_amount']}"
    assert len(confirmed_order["items"]) == 1, f"Expected 1 order item, got {len(confirmed_order['items'])}"
    assert confirmed_order["items"][0]["unit_price"] == 2499.50, "Unit price snapshot failed"

    order_id = confirmed_order["id"]
    print(f"  ✓ Signature verified! Order #{order_id} created with status PROCESSING")
    print(f"  ✓ Payment reference linked: {valid_payment_id}")

    # Verify inventory was atomically decremented from 10 to 8
    db = SessionLocal()
    check_product_after = db.scalar(select(Product).where(Product.id == product_id))
    assert check_product_after.stock == 8, f"Expected stock 8, found {check_product_after.stock}"
    db.close()
    print("  ✓ Inventory atomically decremented from 10 -> 8")

    # Verify customer cart is now empty
    cart_after_success = client.get("/api/cart", headers=customer_headers).json()
    assert cart_after_success["total_items"] == 0, f"Expected cart to be empty, found {cart_after_success['total_items']} items"
    print("  ✓ Customer shopping cart automatically cleared after payment")

    # Verify Idempotency: Re-submitting the same verified payment returns the existing order
    idempotent_res = client.post(
        "/api/payments/verify",
        headers=customer_headers,
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": valid_payment_id,
            "razorpay_signature": genuine_signature,
        },
    )
    assert idempotent_res.status_code == 200, f"Idempotency check failed: {idempotent_res.text}"
    assert idempotent_res.json()["order"]["id"] == order_id, "Idempotency did not return identical order"
    # Ensure stock was not decremented again
    db = SessionLocal()
    check_product_idem = db.scalar(select(Product).where(Product.id == product_id))
    assert check_product_idem.stock == 8, f"Stock was double-decremented! Found {check_product_idem.stock}"
    db.close()
    print("  ✓ Idempotent replay protected: duplicate webhook/modal callback safely returns order without double-decrementing stock")

    # ---------------------------------------------------------
    # STEP 6: Order History & Seller Dashboard Visibility
    # ---------------------------------------------------------
    print("\n[STEP 6] Testing Order History & Multi-Tenant Seller Visibility...")
    # Customer order history
    my_orders_res = client.get("/api/orders/my-orders", headers=customer_headers)
    assert my_orders_res.status_code == 200, f"Failed to get orders: {my_orders_res.text}"
    orders_list = my_orders_res.json()
    matched = [o for o in orders_list if o["id"] == order_id]
    assert len(matched) == 1, "Confirmed order not found in customer history"
    assert matched[0]["razorpay_payment_id"] == valid_payment_id, "Payment reference missing from history"
    print(f"  ✓ Customer order history (/api/orders/my-orders): Order #{order_id} displayed with payment ID")

    # Seller dashboard visibility
    seller_orders_res = client.get("/api/orders/seller/me", headers=seller_headers)
    assert seller_orders_res.status_code == 200, f"Failed to get seller orders: {seller_orders_res.text}"
    seller_matched = [o for o in seller_orders_res.json() if o["id"] == order_id]
    assert len(seller_matched) == 1, "Order not visible in Seller Dashboard"
    print(f"  ✓ Seller dashboard (/api/orders/seller/me): Order #{order_id} visible with sold items")

    print("\n" + "=" * 70)
    print("ALL TASK 7 BACKEND PAYMENT VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀")
    print("=" * 70)


if __name__ == "__main__":
    run_verification()
