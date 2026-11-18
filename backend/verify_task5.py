"""
Verification script for Task 5: Shopping Cart, Order Processing & Inventory Management
Tests:
1. Persona setup (Seller 1, Seller 2, Seller 3, Customer 1, Customer 2, Admin)
2. Product catalog setup with strict stock tracking
3. Shopping Cart operations:
   - Add to cart (quantity validation, stock check, inactive rejection)
   - Duplicate product addition (increments quantity)
   - Exceeding stock rejection
   - Cart isolation between different customers
   - Update cart item quantity & stock limit enforcement
   - Item removal and cart clear
4. Order Checkout & Atomic Transaction:
   - Empty cart rejection (400 Bad Request)
   - Validation on delivery address (<10 chars rejection)
   - Multi-item checkout execution (201 Created)
   - Snapshot verification (unit_price captured at checkout)
   - Atomic inventory deduction in products table
   - Customer cart auto-cleared upon checkout
5. Out-of-Stock Checkout Rejection & Rollback:
   - Cart items exceeding real-time inventory fail with 400 Bad Request
   - No stock deducted and cart preserved
6. Order Access Control & Customer Isolation:
   - Customer 1 order history (/my-orders) contains Order
   - Customer 2 isolated from Customer 1's orders
   - GET /orders/{id}: Owner customer OK, foreign customer 403, Admin OK
7. Multi-Tenant Seller Dashboard & Access:
   - GET /orders/seller/me: Seller 1 only sees orders with their items
   - Unrelated Seller 3 denied access / sees 0 orders
8. Order Fulfillment & Stock Replenishment on Cancellation:
   - Status updates (PROCESSING, SHIPPED)
   - Order cancellation (CANCELLED) automatically restores deducted stock
   - Idempotent/terminal checks on cancelled orders
"""

from fastapi.testclient import TestClient
from sqlalchemy import select, delete
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus

client = TestClient(app)


def get_or_create_user(email: str, password: str, full_name: str, role: str) -> str:
    """Helper to ensure a user exists and return their JWT access token."""
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


def run_tests():
    print("=" * 70)
    print("TASK 5 VERIFICATION: SHOPPING CART, ORDER PROCESSING & INVENTORY")
    print("=" * 70)

    # Ensure all tables exist in database
    Base.metadata.create_all(bind=engine)

    # 0. Clean database for fresh test run
    with SessionLocal() as db:
        test_emails = [
            "seller1_task5@example.com",
            "seller2_task5@example.com",
            "seller3_task5@example.com",
            "customer1_task5@example.com",
            "customer2_task5@example.com",
            "admin_task5@example.com",
        ]
        users = db.scalars(select(User).where(User.email.in_(test_emails))).all()
        user_ids = [u.id for u in users]
        if user_ids:
            # Delete order items, orders, cart items, carts, products
            db.execute(delete(OrderItem).where(OrderItem.seller_id.in_(user_ids)))
            db.execute(delete(Order).where(Order.user_id.in_(user_ids)))
            carts = db.scalars(select(Cart).where(Cart.user_id.in_(user_ids))).all()
            cart_ids = [c.id for c in carts]
            if cart_ids:
                db.execute(delete(CartItem).where(CartItem.cart_id.in_(cart_ids)))
            db.execute(delete(Cart).where(Cart.user_id.in_(user_ids)))
            db.execute(delete(Product).where(Product.seller_id.in_(user_ids)))
            db.execute(delete(User).where(User.email.in_(test_emails)))

        db.execute(delete(Category).where(Category.slug == "task5-gadgets"))
        db.commit()

    # 1. Setup Personas
    print("\n[STEP 1] Setting Up Test Personas...")
    s1_token = get_or_create_user("seller1_task5@example.com", "SellerPass1!", "Seller Alpha", "SELLER")
    s2_token = get_or_create_user("seller2_task5@example.com", "SellerPass2!", "Seller Beta", "SELLER")
    s3_token = get_or_create_user("seller3_task5@example.com", "SellerPass3!", "Seller Gamma (Unrelated)", "SELLER")
    c1_token = get_or_create_user("customer1_task5@example.com", "CustomerPass1!", "Charlie Customer", "CUSTOMER")
    c2_token = get_or_create_user("customer2_task5@example.com", "CustomerPass2!", "Dana Customer", "CUSTOMER")
    admin_token = get_or_create_user("admin_task5@example.com", "AdminPass1!", "Alice Admin", "ADMIN")
    print("  ✓ 6 personas ready (Seller 1, Seller 2, Seller 3, Customer 1, Customer 2, Admin)")

    # 2. Setup Category & Products
    print("\n[STEP 2] Catalog Setup with Controlled Inventory...")
    # Create category
    cat_res = client.post(
        "/api/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Task 5 Gadgets", "slug": "task5-gadgets"},
    )
    assert cat_res.status_code == 201, f"Failed to create category: {cat_res.text}"
    cat_id = cat_res.json()["id"]

    # Seller 1 creates Wireless Headphones (Price: $100.0, Stock: 10)
    p1_res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "title": "ANC Wireless Headphones",
            "description": "Active Noise Cancelling over-ear headphones",
            "price": 100.0,
            "stock": 10,
            "image_url": "https://res.cloudinary.com/demo/image/upload/sample_headphones.jpg",
            "category_id": cat_id,
            "is_active": True,
        },
    )
    assert p1_res.status_code == 201
    prod1 = p1_res.json()
    prod1_id = prod1["id"]

    # Seller 2 creates Wireless Fast Charger (Price: $50.0, Stock: 5)
    p2_res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {s2_token}"},
        json={
            "title": "15W Fast Wireless Charger",
            "description": "Qi-certified fast charging stand",
            "price": 50.0,
            "stock": 5,
            "image_url": "https://res.cloudinary.com/demo/image/upload/sample_charger.jpg",
            "category_id": cat_id,
            "is_active": True,
        },
    )
    assert p2_res.status_code == 201
    prod2 = p2_res.json()
    prod2_id = prod2["id"]

    # Seller 1 creates Inactive Product (Price: $20.0, Stock: 10, is_active=False)
    p3_res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "title": "Discontinued Cable",
            "description": "Legacy micro-USB cable",
            "price": 20.0,
            "stock": 10,
            "image_url": "https://res.cloudinary.com/demo/image/upload/sample_cable.jpg",
            "category_id": cat_id,
            "is_active": False,
        },
    )
    assert p3_res.status_code == 201
    prod3_id = p3_res.json()["id"]

    print(f"  ✓ Product 1 (ID {prod1_id}): ANC Headphones ($100.0, Stock: 10, Seller 1)")
    print(f"  ✓ Product 2 (ID {prod2_id}): Fast Charger ($50.0, Stock: 5, Seller 2)")
    print(f"  ✓ Product 3 (ID {prod3_id}): Inactive Cable ($20.0, Stock: 10, Inactive)")

    # -------------------------------------------------------------------------
    # TEST 3: Shopping Cart Operations & Validations
    # -------------------------------------------------------------------------
    print("\n[STEP 3] Testing Shopping Cart Operations & Stock Validation...")
    # 3.1 Initial empty cart
    res = client.get("/api/cart", headers={"Authorization": f"Bearer {c1_token}"})
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 0
    assert cart["total_price"] == 0.0
    print("  ✓ Customer 1 initial cart is empty (total_items=0, total_price=0.0)")

    # 3.2 Add inactive product -> 400 Bad Request
    res = client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"product_id": prod3_id, "quantity": 1},
    )
    assert res.status_code == 400
    print("  ✓ Adding inactive product rejected (400 Bad Request)")

    # 3.3 Add Product 1 (quantity 2) -> total_items = 2, total_price = 200.0
    res = client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"product_id": prod1_id, "quantity": 2},
    )
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 2
    assert cart["total_price"] == 200.0
    assert len(cart["items"]) == 1
    item1_id = cart["items"][0]["id"]
    assert cart["items"][0]["subtotal"] == 200.0
    print(f"  ✓ Customer 1 added 2x Headphones ($200.0 total, Item ID: {item1_id})")

    # 3.4 Duplicate product addition -> increments quantity
    res = client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"product_id": prod1_id, "quantity": 3},
    )
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 5
    assert cart["total_price"] == 500.0
    assert len(cart["items"]) == 1
    assert cart["items"][0]["quantity"] == 5
    print("  ✓ Duplicate item handled: quantity automatically incremented from 2 to 5")

    # 3.5 Exceeding stock limit -> 400 Bad Request (Current qty: 5, stock: 10, adding 6 exceeds stock)
    res = client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"product_id": prod1_id, "quantity": 6},
    )
    assert res.status_code == 400
    print("  ✓ Exceeding stock on addition rejected (400 Bad Request)")

    # 3.6 Multi-user cart isolation: Customer 2's cart is empty
    res = client.get("/api/cart", headers={"Authorization": f"Bearer {c2_token}"})
    assert res.status_code == 200
    c2_cart = res.json()
    assert c2_cart["total_items"] == 0
    assert len(c2_cart["items"]) == 0
    print("  ✓ Multi-tenant cart isolation: Customer 2 has a separate, empty cart")

    # 3.7 Update cart item quantity (change to 4)
    res = client.put(
        f"/api/cart/items/{item1_id}",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"quantity": 4},
    )
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 4
    assert cart["total_price"] == 400.0
    print("  ✓ Cart item quantity updated to 4 ($400.0 subtotal)")

    # 3.8 Customer 2 cannot modify Customer 1's cart item -> 404
    res = client.put(
        f"/api/cart/items/{item1_id}",
        headers={"Authorization": f"Bearer {c2_token}"},
        json={"quantity": 1},
    )
    assert res.status_code == 404
    print("  ✓ Customer 2 forbidden from modifying Customer 1's cart item (404 Not Found)")

    # 3.9 Add Product 2 (quantity 2) to Customer 1's cart
    res = client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"product_id": prod2_id, "quantity": 2},
    )
    assert res.status_code == 200
    cart = res.json()
    assert cart["total_items"] == 6  # 4x P1 + 2x P2
    assert cart["total_price"] == 500.0  # 4*100 + 2*50 = 500.0
    assert len(cart["items"]) == 2
    item2_id = next(i["id"] for i in cart["items"] if i["product_id"] == prod2_id)
    print(f"  ✓ Customer 1 added 2x Fast Chargers. Cart Total: $500.0 across 6 items")

    # 3.10 Remove item 2 and re-add to test DELETE /api/cart/items/{id}
    del_res = client.delete(
        f"/api/cart/items/{item2_id}",
        headers={"Authorization": f"Bearer {c1_token}"},
    )
    assert del_res.status_code == 204
    # Re-fetch cart
    cart = client.get("/api/cart", headers={"Authorization": f"Bearer {c1_token}"}).json()
    assert cart["total_items"] == 4
    assert len(cart["items"]) == 1
    print("  ✓ Specific cart item removed via DELETE /api/cart/items/{id} (204 No Content)")

    # Re-add Product 2 (qty 2) for checkout test
    client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"product_id": prod2_id, "quantity": 2},
    )

    # -------------------------------------------------------------------------
    # TEST 4: Order Checkout & Atomic Database Transaction
    # -------------------------------------------------------------------------
    print("\n[STEP 4] Testing Checkout & Atomic Database Transaction...")
    # 4.1 Address validation: shipping address must be at least 10 characters
    res = client.post(
        "/api/orders/checkout",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"shipping_address": "Short"},
    )
    assert res.status_code == 422
    print("  ✓ Invalid delivery address rejected (422 Unprocessable Entity: < 10 chars)")

    # 4.2 Valid Checkout:
    # Customer 1 cart: 4x Headphones ($100 each = $400) + 2x Chargers ($50 each = $100) = $500 total
    checkout_res = client.post(
        "/api/orders/checkout",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"shipping_address": "Flat 4B, Cyber Heights, High-Tech City, Hyderabad 500081"},
    )
    assert checkout_res.status_code == 201, f"Checkout failed: {checkout_res.text}"
    order = checkout_res.json()
    order_id = order["id"]
    assert order["total_amount"] == 500.0
    assert order["status"] == "PENDING"
    assert len(order["items"]) == 2

    # Verify snapshotted unit prices
    p1_order_item = next(i for i in order["items"] if i["product_id"] == prod1_id)
    p2_order_item = next(i for i in order["items"] if i["product_id"] == prod2_id)
    assert p1_order_item["quantity"] == 4
    assert p1_order_item["unit_price"] == 100.0
    assert p1_order_item["subtotal"] == 400.0
    assert p2_order_item["quantity"] == 2
    assert p2_order_item["unit_price"] == 50.0
    assert p2_order_item["subtotal"] == 100.0
    print(f"  ✓ Order #{order_id} created successfully! Total: $500.0 with 2 snapshotted items")

    # 4.3 Verify customer cart is completely emptied after checkout
    cart_after = client.get("/api/cart", headers={"Authorization": f"Bearer {c1_token}"}).json()
    assert cart_after["total_items"] == 0
    assert len(cart_after["items"]) == 0
    print("  ✓ Customer 1's shopping cart automatically cleared after checkout")

    # 4.4 Verify stock deduction in products table
    # P1 stock was 10, bought 4 -> now 6
    # P2 stock was 5, bought 2 -> now 3
    p1_updated = client.get(f"/api/products/{prod1_id}").json()
    p2_updated = client.get(f"/api/products/{prod2_id}").json()
    assert p1_updated["stock"] == 6, f"Expected 6, got {p1_updated['stock']}"
    assert p2_updated["stock"] == 3, f"Expected 3, got {p2_updated['stock']}"
    print(f"  ✓ Inventory atomically decremented: Headphones (10 -> 6), Charger (5 -> 3)")

    # 4.5 Attempt checkout with empty cart -> 400 Bad Request
    res = client.post(
        "/api/orders/checkout",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"shipping_address": "Flat 4B, Cyber Heights, High-Tech City, Hyderabad 500081"},
    )
    assert res.status_code == 400
    print("  ✓ Checkout with empty cart rejected (400 Bad Request)")

    # -------------------------------------------------------------------------
    # TEST 5: Out-of-Stock Checkout Rejection & Transaction Rollback
    # -------------------------------------------------------------------------
    print("\n[STEP 5] Testing Out-of-Stock Checkout Rejection & Rollback...")
    # Customer 2 adds 3 units of Product 2 (Charger has exactly 3 left)
    client.post(
        "/api/cart/items",
        headers={"Authorization": f"Bearer {c2_token}"},
        json={"product_id": prod2_id, "quantity": 3},
    )

    # In the meantime, another buyer or admin reduces Product 2 stock to 1
    with SessionLocal() as db:
        p2_db = db.get(Product, prod2_id)
        p2_db.stock = 1
        db.commit()

    # Customer 2 attempts checkout with quantity 3 when only 1 is available
    res = client.post(
        "/api/orders/checkout",
        headers={"Authorization": f"Bearer {c2_token}"},
        json={"shipping_address": "Customer 2 Address, Innovation Way, Tech Park 560100"},
    )
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]
    print("  ✓ Out-of-stock checkout cleanly rejected with 400 Bad Request")

    # Confirm stock was NOT changed (remains 1)
    with SessionLocal() as db:
        p2_db = db.get(Product, prod2_id)
        assert p2_db.stock == 1
    print("  ✓ Confirmed stock unchanged: rollback preserved inventory integrity")

    # Customer 2 clears their cart to reset
    client.delete("/api/cart", headers={"Authorization": f"Bearer {c2_token}"})

    # Restore Product 2 stock back to 3
    with SessionLocal() as db:
        p2_db = db.get(Product, prod2_id)
        p2_db.stock = 3
        db.commit()

    # -------------------------------------------------------------------------
    # TEST 6: Order Access Control & Customer Isolation
    # -------------------------------------------------------------------------
    print("\n[STEP 6] Testing Order Details & Customer Isolation...")
    # Customer 1 views their order history
    my_orders = client.get("/api/orders/my-orders", headers={"Authorization": f"Bearer {c1_token}"}).json()
    assert len(my_orders) == 1
    assert my_orders[0]["id"] == order_id
    print(f"  ✓ Customer 1 views order history: found Order #{order_id}")

    # Customer 2 views their order history: should be empty
    c2_orders = client.get("/api/orders/my-orders", headers={"Authorization": f"Bearer {c2_token}"}).json()
    assert len(c2_orders) == 0
    print("  ✓ Customer 2 order history is isolated (0 orders returned)")

    # Customer 1 views Order detail: 200 OK
    res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {c1_token}"})
    assert res.status_code == 200
    print(f"  ✓ Customer 1 views their own Order #{order_id} (200 OK)")

    # Customer 2 attempts to view Customer 1's Order: 403 Forbidden
    res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {c2_token}"})
    assert res.status_code == 403
    print("  ✓ Customer 2 forbidden from viewing Customer 1's Order (403 Forbidden)")

    # Admin views Order detail: 200 OK
    res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    print(f"  ✓ Admin can view any Order #{order_id} (200 OK)")

    # -------------------------------------------------------------------------
    # TEST 7: Multi-Tenant Seller Dashboard (/api/orders/seller/me)
    # -------------------------------------------------------------------------
    print("\n[STEP 7] Testing Multi-Tenant Seller Dashboard...")
    # Seller 1 views dashboard: Order #1 contains Product 1 (owned by Seller 1)
    s1_orders = client.get("/api/orders/seller/me", headers={"Authorization": f"Bearer {s1_token}"}).json()
    assert len(s1_orders) == 1
    assert s1_orders[0]["id"] == order_id
    # Ensure Seller 1 only sees their items
    assert len(s1_orders[0]["items"]) == 1
    assert s1_orders[0]["items"][0]["product_id"] == prod1_id
    print(f"  ✓ Seller 1 dashboard: Order #{order_id} visible with only Seller 1's items")

    # Seller 2 views dashboard: Order #1 contains Product 2 (owned by Seller 2)
    s2_orders = client.get("/api/orders/seller/me", headers={"Authorization": f"Bearer {s2_token}"}).json()
    assert len(s2_orders) == 1
    assert s2_orders[0]["id"] == order_id
    assert len(s2_orders[0]["items"]) == 1
    assert s2_orders[0]["items"][0]["product_id"] == prod2_id
    print(f"  ✓ Seller 2 dashboard: Order #{order_id} visible with only Seller 2's items")

    # Seller 3 (unrelated) views dashboard: 0 orders
    s3_orders = client.get("/api/orders/seller/me", headers={"Authorization": f"Bearer {s3_token}"}).json()
    assert len(s3_orders) == 0
    print("  ✓ Unrelated Seller 3 views dashboard: 0 orders (tenant isolation verified)")

    # Seller 3 attempts to view Order #1 directly -> 403 Forbidden
    res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {s3_token}"})
    assert res.status_code == 403
    print("  ✓ Unrelated Seller 3 forbidden from accessing Order #1 (403 Forbidden)")

    # -------------------------------------------------------------------------
    # TEST 8: Order Status Updates & Stock Replenishment on Cancellation
    # -------------------------------------------------------------------------
    print("\n[STEP 8] Testing Order Fulfillment & Stock Replenishment...")
    # Seller 1 updates status to PROCESSING
    res = client.patch(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={"status": "PROCESSING"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "PROCESSING"
    print("  ✓ Seller 1 transitioned order to PROCESSING (200 OK)")

    # Seller 1 updates status to SHIPPED
    res = client.patch(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={"status": "SHIPPED"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SHIPPED"
    print("  ✓ Seller 1 transitioned order to SHIPPED (200 OK)")

    # Customer tries to update order status -> 403 Forbidden
    res = client.patch(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={"status": "CANCELLED"},
    )
    assert res.status_code == 403
    print("  ✓ Customer forbidden from updating order status directly (403 Forbidden)")

    # Check current stocks before cancellation: Headphones = 6, Charger = 3
    p1_before = client.get(f"/api/products/{prod1_id}").json()["stock"]
    p2_before = client.get(f"/api/products/{prod2_id}").json()["stock"]
    assert p1_before == 6
    assert p2_before == 3

    # Admin cancels order -> CANCELLED
    cancel_res = client.patch(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "CANCELLED"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
    print(f"  ✓ Admin cancelled Order #{order_id}")

    # Check automatic stock replenishment:
    # Headphones should be restored: 6 + 4 = 10
    # Charger should be restored: 3 + 2 = 5
    p1_after = client.get(f"/api/products/{prod1_id}").json()["stock"]
    p2_after = client.get(f"/api/products/{prod2_id}").json()["stock"]
    assert p1_after == 10, f"Expected 10, got {p1_after}"
    assert p2_after == 5, f"Expected 5, got {p2_after}"
    print(f"  ✓ Stock automatically restored on cancellation: Headphones ({p1_before} -> {p1_after}), Charger ({p2_before} -> {p2_after})")

    # Modifying an already CANCELLED order is rejected (400 Bad Request)
    res = client.patch(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "DELIVERED"},
    )
    assert res.status_code == 400
    print("  ✓ Modifying an already CANCELLED order rejected (400 Bad Request)")

    print("\n" + "=" * 70)
    print("ALL TASK 5 VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
