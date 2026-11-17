"""
Verification script for Task 3: Authentication & Role-Based Access Control (RBAC)
Tests:
1. User registration (Success and duplicate handling)
2. User authentication and JWT generation (Success and invalid credentials)
3. Authenticated profile retrieval (/api/auth/me)
4. Role-based route protection (403 Forbidden for unauthorized role, 200 OK for allowed role)
"""

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User

client = TestClient(app)


def run_tests():
    print("=" * 60)
    print("TASK 3 VERIFICATION: AUTHENTICATION & RBAC")
    print("=" * 60)

    # 1. Clean up any existing test users in the database
    with SessionLocal() as db:
        db.query(User).filter(
            User.email.in_(["alice@example.com", "bob_admin@example.com"])
        ).delete(synchronize_session=False)
        db.commit()

    # ---------------------------------------------------------
    # TEST 1: User Registration
    # ---------------------------------------------------------
    print("\n[TEST 1] Registering Customer User...")
    customer_payload = {
        "email": "alice@example.com",
        "password": "CustomerSecurePass123!",
        "full_name": "Alice Customer",
        "role": "CUSTOMER",
    }
    res = client.post("/api/auth/register", json=customer_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    user_data = res.json()
    assert user_data["email"] == "alice@example.com"
    assert user_data["role"] == "CUSTOMER"
    assert user_data["full_name"] == "Alice Customer"
    assert "hashed_password" not in user_data
    assert "password" not in user_data
    print("  ✓ Customer registration passed (201 Created)")

    print("\n[TEST 1b] Testing Duplicate Registration Prevention...")
    dup_res = client.post("/api/auth/register", json=customer_payload)
    assert dup_res.status_code == 400, f"Expected 400, got {dup_res.status_code}: {dup_res.text}"
    assert "already registered" in dup_res.json()["detail"].lower()
    print("  ✓ Duplicate registration rejected (400 Bad Request)")

    print("\n[TEST 1c] Registering Admin User...")
    admin_payload = {
        "email": "bob_admin@example.com",
        "password": "AdminSecurePass123!",
        "full_name": "Bob Admin",
        "role": "ADMIN",
    }
    res_admin = client.post("/api/auth/register", json=admin_payload)
    assert res_admin.status_code == 201
    assert res_admin.json()["role"] == "ADMIN"
    print("  ✓ Admin registration passed (201 Created)")

    # ---------------------------------------------------------
    # TEST 2: User Login & Token Issuance
    # ---------------------------------------------------------
    print("\n[TEST 2] Testing User Login with Invalid Password...")
    bad_login_res = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "WrongPassword!"},
    )
    assert bad_login_res.status_code == 401, f"Expected 401, got {bad_login_res.status_code}"
    print("  ✓ Invalid password rejected (401 Unauthorized)")

    print("\n[TEST 2b] Logging in as Customer...")
    login_res = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "CustomerSecurePass123!"},
    )
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}: {login_res.text}"
    customer_token_data = login_res.json()
    assert "access_token" in customer_token_data
    assert customer_token_data["token_type"].lower() == "bearer"
    customer_token = customer_token_data["access_token"]
    print("  ✓ Customer login successful (200 OK, JWT Bearer token issued)")

    print("\n[TEST 2c] Logging in as Admin...")
    admin_login_res = client.post(
        "/api/auth/login",
        json={"email": "bob_admin@example.com", "password": "AdminSecurePass123!"},
    )
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["access_token"]
    print("  ✓ Admin login successful (200 OK, JWT Bearer token issued)")

    # ---------------------------------------------------------
    # TEST 3: Protected Profile Route (/api/auth/me)
    # ---------------------------------------------------------
    print("\n[TEST 3] Accessing /api/auth/me without Token...")
    no_token_res = client.get("/api/auth/me")
    assert no_token_res.status_code == 401, f"Expected 401, got {no_token_res.status_code}"
    print("  ✓ Unauthenticated access rejected (401 Unauthorized)")

    print("\n[TEST 3b] Accessing /api/auth/me with Valid Customer Token...")
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert me_res.status_code == 200, f"Expected 200, got {me_res.status_code}: {me_res.text}"
    profile = me_res.json()
    assert profile["email"] == "alice@example.com"
    assert profile["role"] == "CUSTOMER"
    print(f"  ✓ Authenticated user profile retrieved: {profile['full_name']} ({profile['role']})")

    # ---------------------------------------------------------
    # TEST 4: Role-Based Access Control (/api/auth/admin-only)
    # ---------------------------------------------------------
    print("\n[TEST 4] Testing RBAC: Accessing Admin-Only Route as CUSTOMER...")
    rbac_fail_res = client.get(
        "/api/auth/admin-only",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert rbac_fail_res.status_code == 403, f"Expected 403 Forbidden, got {rbac_fail_res.status_code}: {rbac_fail_res.text}"
    print("  ✓ Customer denied access to Admin route (403 Forbidden)")

    print("\n[TEST 4b] Testing RBAC: Accessing Admin-Only Route as ADMIN...")
    rbac_pass_res = client.get(
        "/api/auth/admin-only",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rbac_pass_res.status_code == 200, f"Expected 200 OK, got {rbac_pass_res.status_code}: {rbac_pass_res.text}"
    admin_profile = rbac_pass_res.json()
    assert admin_profile["role"] == "ADMIN"
    print(f"  ✓ Admin granted access to Admin route (200 OK): {admin_profile['email']}")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
