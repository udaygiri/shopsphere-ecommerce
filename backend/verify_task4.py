"""
Verification script for Task 4: Product Management & Category Catalog
Tests:
1. Category Management (Public list, Seller/Admin creation, duplicate check, Customer rejection)
2. Product Creation (Cloudinary image URL, auto-attached seller_id, RBAC restriction)
3. Public Storefront Catalog (Search, Category filter, Pagination, Single product detail)
4. Seller Dashboard (/api/products/seller/me isolation)
5. Product Update RBAC (Owner seller success, unauthorized seller rejection, Admin override)
6. Product Delete RBAC (Owner seller success, unauthorized seller rejection, Admin override)
"""

from fastapi.testclient import TestClient
from sqlalchemy import select, delete
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.product import Product

client = TestClient(app)


def get_or_create_user(email: str, password: str, full_name: str, role: str) -> str:
    """Helper to ensure a user exists and returns their JWT access token."""
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
    print("=" * 65)
    print("TASK 4 VERIFICATION: PRODUCT MANAGEMENT & CATEGORY CATALOG")
    print("=" * 65)

    # Ensure all database tables exist
    Base.metadata.create_all(bind=engine)

    # 0. Clean database for fresh test run
    with SessionLocal() as db:
        # Delete test products, categories, and test users
        test_emails = [
            "seller1_task4@example.com",
            "seller2_task4@example.com",
            "customer_task4@example.com",
            "admin_task4@example.com",
        ]
        users = db.scalars(select(User).where(User.email.in_(test_emails))).all()
        user_ids = [u.id for u in users]
        if user_ids:
            db.execute(delete(Product).where(Product.seller_id.in_(user_ids)))
        test_categories = ["Electronics Test", "Home & Kitchen Test"]
        db.execute(delete(Category).where(Category.name.in_(test_categories)))
        db.execute(delete(User).where(User.email.in_(test_emails)))
        db.commit()

    # 1. Setup Test Users
    print("\n[STEP 1] Setting Up Test Personas...")
    seller1_token = get_or_create_user(
        "seller1_task4@example.com", "SellerPass123!", "Seller One", "SELLER"
    )
    seller2_token = get_or_create_user(
        "seller2_task4@example.com", "SellerPass123!", "Seller Two", "SELLER"
    )
    customer_token = get_or_create_user(
        "customer_task4@example.com", "CustomerPass123!", "Charlie Customer", "CUSTOMER"
    )
    admin_token = get_or_create_user(
        "admin_task4@example.com", "AdminPass123!", "Alice Admin", "ADMIN"
    )
    print("  ✓ All 4 personas ready (Seller 1, Seller 2, Customer, Admin)")

    # -------------------------------------------------------------------------
    # TEST 2: Category Management & RBAC
    # -------------------------------------------------------------------------
    print("\n[STEP 2] Testing Category Management & RBAC...")
    # Customer tries to create category -> 403 Forbidden
    res = client.post(
        "/api/categories",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"name": "Electronics Test"},
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"
    print("  ✓ Customer rejected from creating category (403 Forbidden)")

    # Seller creates category with explicit slug
    res = client.post(
        "/api/categories",
        headers={"Authorization": f"Bearer {seller1_token}"},
        json={"name": "Electronics Test", "slug": "electronics-test"},
    )
    assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
    cat_electronics = res.json()
    assert cat_electronics["slug"] == "electronics-test"
    cat_electronics_id = cat_electronics["id"]
    print(f"  ✓ Seller created category '{cat_electronics['name']}' (ID: {cat_electronics_id})")

    # Admin creates category with auto-generated slug
    res = client.post(
        "/api/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Home & Kitchen Test"},
    )
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    cat_home = res.json()
    assert cat_home["slug"] == "home-kitchen-test"
    cat_home_id = cat_home["id"]
    print(f"  ✓ Admin created category '{cat_home['name']}' (Auto-slug: {cat_home['slug']})")

    # Duplicate category name prevention
    res = client.post(
        "/api/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Electronics Test"},
    )
    assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
    print("  ✓ Duplicate category name rejected (400 Bad Request)")

    # Public category listing
    res = client.get("/api/categories")
    assert res.status_code == 200
    category_names = [c["name"] for c in res.json()]
    assert "Electronics Test" in category_names
    assert "Home & Kitchen Test" in category_names
    print(f"  ✓ Public category catalog accessible ({len(category_names)} categories listed)")

    # -------------------------------------------------------------------------
    # TEST 3: Product Creation & Cloudinary Image Attachment
    # -------------------------------------------------------------------------
    print("\n[STEP 3] Testing Product Creation & Cloudinary Image Storage...")
    # Customer tries to create product -> 403 Forbidden
    product_payload = {
        "title": "Mechanical RGB Keyboard",
        "description": "Ergonomic tactile mechanical gaming keyboard",
        "price": 129.99,
        "stock": 40,
        "image_url": "https://res.cloudinary.com/demo/image/upload/sample_keyboard.jpg",
        "category_id": cat_electronics_id,
        "is_active": True,
    }
    res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {customer_token}"},
        json=product_payload,
    )
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    print("  ✓ Customer forbidden from creating products (403 Forbidden)")

    # Seller 1 creates Product 1
    res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {seller1_token}"},
        json=product_payload,
    )
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    prod1 = res.json()
    assert prod1["title"] == "Mechanical RGB Keyboard"
    assert prod1["price"] == 129.99
    assert prod1["stock"] == 40
    assert prod1["image_url"] == "https://res.cloudinary.com/demo/image/upload/sample_keyboard.jpg"
    assert prod1["category_id"] == cat_electronics_id
    assert prod1["category"]["name"] == "Electronics Test"
    prod1_id = prod1["id"]
    seller1_id = prod1["seller_id"]
    print(f"  ✓ Seller 1 created Product #{prod1_id} with Cloudinary image and auto-assigned seller_id={seller1_id}")

    # Seller 2 creates Product 2 in Home & Kitchen
    prod2_payload = {
        "title": "Smart Coffee Maker",
        "description": "12-cup programmable thermal coffee maker with timer",
        "price": 89.50,
        "stock": 15,
        "image_url": "https://res.cloudinary.com/demo/image/upload/sample_coffee.jpg",
        "category_id": cat_home_id,
        "is_active": True,
    }
    res = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {seller2_token}"},
        json=prod2_payload,
    )
    assert res.status_code == 201
    prod2 = res.json()
    prod2_id = prod2["id"]
    seller2_id = prod2["seller_id"]
    assert seller1_id != seller2_id, "Sellers must have distinct IDs"
    print(f"  ✓ Seller 2 created Product #{prod2_id} with seller_id={seller2_id}")

    # -------------------------------------------------------------------------
    # TEST 4: Public Catalog, Filtering, Search, and Pagination
    # -------------------------------------------------------------------------
    print("\n[STEP 4] Testing Public Storefront Catalog (Search, Filter, Pagination)...")
    # Public list all
    res = client.get("/api/products")
    assert res.status_code == 200
    all_prods = res.json()
    all_prod_ids = [p["id"] for p in all_prods]
    assert prod1_id in all_prod_ids and prod2_id in all_prod_ids
    print(f"  ✓ Public catalog lists active products ({len(all_prods)} retrieved)")

    # Filter by category
    res = client.get(f"/api/products?category_id={cat_electronics_id}")
    assert res.status_code == 200
    cat_prods = res.json()
    assert all(p["category_id"] == cat_electronics_id for p in cat_prods)
    assert any(p["id"] == prod1_id for p in cat_prods)
    print(f"  ✓ Category filtering verified: only {cat_electronics['name']} products returned")

    # Search keyword in title or description
    res = client.get("/api/products?search=coffee")
    assert res.status_code == 200
    search_prods = res.json()
    assert len(search_prods) >= 1
    assert any(p["id"] == prod2_id for p in search_prods)
    assert not any(p["id"] == prod1_id for p in search_prods)
    print("  ✓ Keyword search verified: 'coffee' matched Smart Coffee Maker")

    # Pagination: limit=1
    res = client.get("/api/products?skip=0&limit=1")
    assert res.status_code == 200
    page_prods = res.json()
    assert len(page_prods) == 1
    print("  ✓ Pagination verified: limit=1 returned exactly 1 item")

    # Single product details
    res = client.get(f"/api/products/{prod1_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == prod1_id
    assert detail["title"] == "Mechanical RGB Keyboard"
    assert detail["category"]["name"] == "Electronics Test"
    print(f"  ✓ Single product details retrieved for #{prod1_id}")

    # Non-existent product -> 404
    res = client.get("/api/products/999999")
    assert res.status_code == 404
    print("  ✓ Non-existent product returns 404 Not Found")

    # -------------------------------------------------------------------------
    # TEST 5: Seller Dashboard Isolation (/api/products/seller/me)
    # -------------------------------------------------------------------------
    print("\n[STEP 5] Testing Seller Dashboard (/api/products/seller/me)...")
    # Customer cannot access seller dashboard
    res = client.get(
        "/api/products/seller/me",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert res.status_code == 403
    print("  ✓ Customer rejected from seller dashboard (403 Forbidden)")

    # Seller 1 views dashboard: only sees their own products
    res = client.get(
        "/api/products/seller/me",
        headers={"Authorization": f"Bearer {seller1_token}"},
    )
    assert res.status_code == 200
    s1_prods = res.json()
    assert all(p["seller_id"] == seller1_id for p in s1_prods)
    assert any(p["id"] == prod1_id for p in s1_prods)
    assert not any(p["id"] == prod2_id for p in s1_prods)
    print(f"  ✓ Seller 1 dashboard strictly isolated: {len(s1_prods)} item(s) owned by Seller 1")

    # -------------------------------------------------------------------------
    # TEST 6: Product Update RBAC (Ownership Check)
    # -------------------------------------------------------------------------
    print("\n[STEP 6] Testing Product Modification (PUT) RBAC & Ownership...")
    # Customer tries to edit Seller 1's product -> 403
    res = client.put(
        f"/api/products/{prod1_id}",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"price": 10.00},
    )
    assert res.status_code == 403
    print("  ✓ Customer cannot update product (403 Forbidden)")

    # Seller 2 tries to edit Seller 1's product -> 403 Forbidden
    res = client.put(
        f"/api/products/{prod1_id}",
        headers={"Authorization": f"Bearer {seller2_token}"},
        json={"price": 99.99},
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"
    print("  ✓ Seller 2 denied editing Seller 1's product (403 Forbidden: Ownership enforced)")

    # Seller 1 edits their own product -> 200 OK
    res = client.put(
        f"/api/products/{prod1_id}",
        headers={"Authorization": f"Bearer {seller1_token}"},
        json={"price": 119.99, "title": "Mechanical RGB Keyboard Pro"},
    )
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
    updated_prod = res.json()
    assert updated_prod["price"] == 119.99
    assert updated_prod["title"] == "Mechanical RGB Keyboard Pro"
    print(f"  ✓ Seller 1 successfully updated their own product (Title & Price)")

    # Admin overrides and edits Seller 1's product -> 200 OK
    res = client.put(
        f"/api/products/{prod1_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"stock": 100},
    )
    assert res.status_code == 200
    assert res.json()["stock"] == 100
    print("  ✓ Admin successfully overridden and edited Seller 1's product (Stock=100)")

    # -------------------------------------------------------------------------
    # TEST 7: Product Deletion RBAC (Ownership Check)
    # -------------------------------------------------------------------------
    print("\n[STEP 7] Testing Product Deletion (DELETE) RBAC & Ownership...")
    # Customer tries to delete Seller 2's product -> 403 Forbidden
    res = client.delete(
        f"/api/products/{prod2_id}",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert res.status_code == 403
    print("  ✓ Customer cannot delete product (403 Forbidden)")

    # Seller 1 tries to delete Seller 2's product -> 403 Forbidden
    res = client.delete(
        f"/api/products/{prod2_id}",
        headers={"Authorization": f"Bearer {seller1_token}"},
    )
    assert res.status_code == 403
    print("  ✓ Seller 1 denied deleting Seller 2's product (403 Forbidden)")

    # Seller 2 deletes their own product -> 204 No Content
    res = client.delete(
        f"/api/products/{prod2_id}",
        headers={"Authorization": f"Bearer {seller2_token}"},
    )
    assert res.status_code == 204
    print(f"  ✓ Seller 2 successfully deleted Product #{prod2_id} (204 No Content)")

    # Confirm Product 2 is gone
    res = client.get(f"/api/products/{prod2_id}")
    assert res.status_code == 404
    print(f"  ✓ Confirmed Product #{prod2_id} no longer exists (404 Not Found)")

    # Admin deletes Seller 1's product -> 204 No Content
    res = client.delete(
        f"/api/products/{prod1_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 204
    print(f"  ✓ Admin successfully deleted Product #{prod1_id} (204 No Content)")

    # Confirm Product 1 is gone
    res = client.get(f"/api/products/{prod1_id}")
    assert res.status_code == 404
    print(f"  ✓ Confirmed Product #{prod1_id} no longer exists (404 Not Found)")

    print("\n" + "=" * 65)
    print("ALL TASK 4 VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
