# ShopSphere — Role-Based Full-Stack E-Commerce Platform

A production-ready, full-stack role-based e-commerce web application built for the **Lumos Logic Full Stack Developer Internship Assessment**. 

Built with **FastAPI (Python 3.12+)**, **React 19 (Vite + Tailwind CSS v4)**, **PostgreSQL (Render)**, **Cloudinary**, and **Razorpay Payment Gateway (Test Mode in INR ₹)**.

---

## 🌐 Live Deployments & Repository Links

* **Live Frontend Web App (Vercel):** [https://shopsphere-ecommerce-phi-lime.vercel.app/](https://shopsphere-ecommerce-phi-lime.vercel.app/)
* **Live Backend API (Render):** [https://shopsphere-backend-urqs.onrender.com/](https://shopsphere-backend-urqs.onrender.com/)
* **Interactive OpenAPI / Swagger Documentation:** [https://shopsphere-backend-urqs.onrender.com/docs](https://shopsphere-backend-urqs.onrender.com/docs)
* **GitHub Repository:** [https://github.com/udaygiri/shopsphere-ecommerce](https://github.com/udaygiri/shopsphere-ecommerce)
* **Merged Feature Pull Request:** [Pull Request #1 (feat-add-wishlist)](https://github.com/udaygiri/shopsphere-ecommerce/pull/1)

---

## 🔑 Pre-Seeded Test Credentials for Evaluators

All demo accounts come pre-configured with active data and full permissions matching the assessment specification:

| Role | Email | Password | Access / Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` *(or `admin@demo.com`)* | `password123` | Full platform control: manage all products, platform users, categories, view all orders, platform sales stats |
| **Sales Person** | `sales@example.com` *(or `seller@demo.com`)* | `password123` | Add/edit/delete **only their own products**; view & update orders containing their items |
| **User (Customer)** | `user@example.com` *(or `customer@demo.com`)* | `password123` | Browse catalog, search, filter (category/price), wishlist, shopping cart, Razorpay checkout, personal order history |

> **Tip:** The live login page includes **1-click autofill buttons** for all three roles for immediate testing.

---

## 📸 Application Screenshots

| Storefront Catalog & Dynamic Filters | Interactive Shopping Cart & Wishlist |
| :---: | :---: |
| ![Storefront](screenshots/storefront.png) | ![Cart & Wishlist](screenshots/cart-wishlist.png) |

| Razorpay Test Mode Checkout | Admin Revenue Analytics & Orders Oversight |
| :---: | :---: |
| ![Razorpay Checkout](screenshots/razorpay-checkout.png) | ![Admin Dashboard](screenshots/admin-dashboard.png) |

*(Screenshots are stored in the `/screenshots` directory).*

---

## 🛠️ Tech Stack & Architecture

* **Backend:**
  * **Framework:** FastAPI (Python 3.12+) managed via modern `uv` workflow
  * **Database ORM:** SQLAlchemy 2.0 (SQLite for local dev, PostgreSQL on Render production)
  * **Authentication:** JWT (JSON Web Tokens), `bcrypt` password hashing, Role-Based Access Control (RBAC) via FastAPI Dependency Injection
  * **Validation & Settings:** Pydantic v2 & Pydantic Settings
* **Frontend:**
  * **Framework:** React 19, Vite 6, React Router v7
  * **Styling:** Tailwind CSS v4 with custom e-commerce design system
  * **HTTP Client:** Axios with centralized JWT Bearer interceptor & error normalization
  * **Icons:** Lucide React
* **Third-Party Integrations:**
  * **Cloudinary:** Direct unsigned and server-side image uploads for product catalogs
  * **Razorpay:** Payment order creation in Indian Rupee (INR ₹), checkout modal integration, and HMAC-SHA256 signature verification
* **Cloud Infrastructure:**
  * **Backend & DB:** Render Web Service + Render Managed PostgreSQL
  * **Frontend:** Vercel (with client-side SPA route rewrites)

---

## 👥 Role-Based Access Control (RBAC) Matrix

> **Core Rubric Test:** All permissions are strictly enforced on the **backend API layer** (`app/core/deps.py`), returning `403 FORBIDDEN` on unauthorized requests. UI elements are also dynamically adapted.

| Feature / Action | User (Customer) | Sales Person (Seller) | Admin | Backend Guard |
| :--- | :---: | :---: | :---: | :--- |
| **Browse, Search & Filter Products** | ✅ | ✅ | ✅ | Public endpoint (`GET /api/products`) |
| **Wishlist Management** | ✅ | ❌ | ✅ | `require_role([CUSTOMER, ADMIN])` |
| **Shopping Cart Management** | ✅ | ❌ | ✅ | `require_role([CUSTOMER, ADMIN])` |
| **Razorpay Checkout & Order Placement** | ✅ | ❌ | ✅ | `require_role([CUSTOMER, ADMIN])` |
| **View Personal Past Orders** | ✅ | ❌ | ✅ | Filtered strictly to `current_user.id` |
| **Create New Product (with Cloudinary)** | ❌ | ✅ | ✅ | `require_role([SELLER, ADMIN])` |
| **Update / Delete Products** | ❌ | **Own items only** | **Any item** | Strict ownership check: `product.seller_id == user.id` |
| **View Orders Containing Own Products** | ❌ | ✅ | ✅ | Filtered to orders where items belong to seller |
| **Category Creation & Deletion** | ❌ | ❌ | ✅ | `require_role([ADMIN])` |
| **Platform-Wide Orders & Revenue Stats** | ❌ | ❌ | ✅ | `require_role([ADMIN])` (`GET /api/orders/admin/stats`) |

---

## 📊 Feature Completion Summary (Assessment Rubric)

| Feature | What Was Implemented | How It Works | Assumptions & Limitations |
| :--- | :--- | :--- | :--- |
| **Authentication** | User registration and login with `bcrypt` password hashing and signed JWT bearer tokens. | `POST /api/auth/register` hashes passwords with `bcrypt`. `POST /api/auth/login` validates credentials and issues a signed JWT token containing email and role claims. | Tokens expire in 24 hours. Evaluators can also register new accounts in any role. |
| **Role-Based Access Control (RBAC)** | Strict server-side route guards and ownership verification for Admin, Sales Person, and User. | FastAPI dependency injection (`require_role([...])`) inspects the token role before route execution, raising `403 FORBIDDEN` for unauthorized calls. Seller routes verify `product.seller_id == current_user.id`. | Admin has superuser override over all platform entities. |
| **Product CRUD & Cloudinary Upload** | Full product lifecycle management with Cloudinary image hosting. | Images upload directly to Cloudinary using an unsigned preset; only the returned secure HTTPS image URL is saved to the database. Sellers can only edit/delete their own products; Admin can edit/delete any product. | Images are limited to 10MB (PNG, JPG, WEBP). Raw image bytes are never stored on the application server. |
| **Search & Filters** | Full catalog search and multi-criteria filtering on the backend. | `GET /api/products` accepts `search` (case-insensitive title/description ILIKE matching), `category_id`, and `min_price` / `max_price` query parameters with offset pagination. | Price filtering is computed in real time against unit prices in database. |
| **Wishlist** | Add, remove, and list wishlist items with real-time sync. | `GET /api/wishlist`, `POST /api/wishlist/{product_id}`, and `DELETE /api/wishlist/{product_id}`. Prevents duplicate saves and allows 1-click move to shopping cart. | Wishlist items are tied to authenticated user accounts. |
| **Shopping Cart** | Persistent cart with quantity adjustments, badge counter, and stock validation. | `Cart` and `CartItem` models. Quantity updates validate real-time product inventory. Navbar displays a live badge counter updated via React CartContext. | Cart is automatically cleared upon successful Razorpay payment verification. |
| **Razorpay Payment Gateway** | End-to-end payment flow in Indian Rupee (`INR ₹`) test mode. | Backend creates Razorpay order (`POST /api/payments/create-order`) with amount in paise. Frontend opens Razorpay modal. On payment callback, backend verifies cryptographic HMAC-SHA256 signature (`POST /api/payments/verify`) before creating the order and deducting inventory atomically. | Test mode credentials (`rzp_test_...`) are used; no real money is charged. |
| **Order History & Role Dashboards** | Customized dashboards and order tracking for each role. | Customers view personal past orders. Sellers view orders containing their products and update statuses (`PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`). Admins view platform sales stats (Total Revenue ₹, Orders, Products, Users) and full order oversight. | Cancelling an order automatically replenishes deducted stock back into inventory. |
| **Git Workflow & PR** | Structured git commit history and GitHub Pull Request workflow. | 20+ descriptive commits following conventional commit syntax (`feat:`, `fix:`, `chore:`). Feature branch `feat-add-wishlist` created and merged into `main` via merged Pull Request #1. | Clean linear commit baseline preserved. |
| **Deployment** | Continuous deployment of backend and frontend on cloud infrastructure. | Backend deployed to Render Web Service using Render Blueprint (`render.yaml`) connected to Render Managed PostgreSQL. Frontend deployed to Vercel with SPA rewrites (`vercel.json`). | Render free tier spins down on inactivity; first request may experience a cold start. |

---

## 📝 Implementation Report (Mandatory Assessment Deliverable)

### 1. Overview of Completed Features
The application was built from the ground up to satisfy 100% of the Lumos Logic technical assessment criteria. All 11 milestones were completed:
1. Monorepo architecture with clean `/backend` and `/frontend` separation.
2. Relational schema (Users, Products, Categories, Cart, CartItem, WishlistItem, Order, OrderItem).
3. JWT Authentication with `bcrypt` password hashing and backend RBAC route guards.
4. Product CRUD with multi-tenant seller ownership rules and Cloudinary image storage.
5. Storefront with keyword search, category filtering, and price range filters.
6. Persistent Shopping Cart and Wishlist with instant UI updates.
7. Razorpay Test Mode checkout with HMAC-SHA256 signature verification and atomic inventory transactions.
8. Role-specific dashboards (Customer order tracking, Seller product/order management, Admin platform revenue analytics).
9. Feature branch created and merged via GitHub Pull Request #1.
10. Live deployments active on Render (Backend + PostgreSQL) and Vercel (Frontend).
11. Complete documentation and test credentials.

### 2. Technical Architecture & Implementation Details
* **Strict Backend RBAC:** Authentication is powered by JSON Web Tokens (JWT) signed with `HS256`. A reusable dependency factory `require_role(allowed_roles: list[UserRole])` intercepts incoming requests, validates token integrity, verifies user active status, and rejects unauthorized requests with a clean `403 Forbidden` response before controller logic executes.
* **Direct Cloudinary Integration:** Rather than burdening the application server with large multipart file payloads, the frontend client uploads product media directly to Cloudinary using an unsigned upload preset. Only the resulting HTTPS `secure_url` is transmitted to the FastAPI backend, ensuring zero local file bloat and high CDN performance.
* **Cryptographic Payment Integrity & Idempotency:** The Razorpay payment lifecycle strictly isolates order creation from order completion. The backend generates a Razorpay Order ID. Upon checkout completion, the frontend submits the payment signature. The backend calculates:
  $$\text{expected\_signature} = \text{HMAC-SHA256}(\text{order\_id} + \text{"\|"} + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
  Only when signatures match does the backend execute an atomic database transaction that decrements stock, records the order as `PROCESSING`, and flushes the user's cart. Forged or unverified callbacks are rejected with `400 Bad Request`.
* **Inventory Stock Consistency:** Order cancellation automatically restores snapshot item quantities back to the product's live stock in an atomic database transaction.

### 3. Challenges Faced & How They Were Solved
* **Challenge 1: Render Managed PostgreSQL Driver Dialect Normalization**
  * *Problem:* Render supplies PostgreSQL connection strings formatted as `postgresql://...` or legacy `postgres://...`. In SQLAlchemy 2.0, plain `postgresql://` defaults to the `psycopg` (v3) driver, throwing `ModuleNotFoundError: No module named 'psycopg'` when only `psycopg2-binary` is installed.
  * *Solution:* In `backend/app/core/database.py`, an automated URL normalizer was implemented to dynamically remap incoming PostgreSQL connection strings to `postgresql+psycopg2://`. This resolved the driver mismatch and connected seamlessly to Render's internal managed database.
* **Challenge 2: Single-Page Application (SPA) Client Routing on Vercel**
  * *Problem:* Refreshing any client-side React Router route (e.g. `/cart`, `/wishlist`, `/admin/dashboard`) on Vercel caused HTTP 404 errors because static HTML files do not exist for dynamic paths.
  * *Solution:* Configured `frontend/vercel.json` with a rewrite rule mapping all routes (`/(.*)`) back to `/index.html`, allowing React Router v7 to handle routing flawlessly on page reload.
* **Challenge 3: Multi-Tenant Seller Item Isolation**
  * *Problem:* When a customer places an order containing items from multiple distinct sellers, sellers must only see their own items and revenue, while Admins must see the entire order.
  * *Solution:* Engineered the order retrieval query (`GET /api/orders/seller/me`) to filter order items on the database layer: Sellers receive orders where `item.seller_id == current_user.id`, with other sellers' items filtered out of their view, while Admins receive the complete order payload.

### 4. Known Limitations & Future Enhancements
* **Render Free Tier Cold Starts:** Because Render free-tier web services spin down after 15 minutes of inactivity, initial requests after idle periods may take ~30–50 seconds to boot.
* **Email Notifications:** Order status changes currently update directly in the database; integration with an SMTP service (SendGrid/Resend) for automated customer email receipts would be a natural next addition.

### 5. Verified Test Credentials
* **Admin:** `admin@example.com` / `password123`
* **Sales Person:** `sales@example.com` / `password123`
* **User (Customer):** `user@example.com` / `password123`

---

## 💻 Local Setup & Installation

### Prerequisites
* **Python 3.12+** and **`uv`** package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
* **Node.js 18+** and **`npm`**

### 1. Clone the Repository
```bash
git clone https://github.com/udaygiri/shopsphere-ecommerce.git
cd shopsphere-ecommerce
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env

# Install dependencies using uv
uv sync

# Launch FastAPI development server
uv run uvicorn app.main:app --reload --port 8000
```
* API: `http://localhost:8000/api`
* Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd ../frontend
cp .env.example .env

# Install dependencies
npm install

# Launch Vite development server
npm run dev
```
* Storefront Web Application: `http://localhost:5173`

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)
```env
ENVIRONMENT=production
PORT=8000
FRONTEND_URL=https://shopsphere-ecommerce-phi-lime.vercel.app

# Database (SQLite local, PostgreSQL production)
DATABASE_URL=sqlite:///./ecommerce.db

# JWT Security
SECRET_KEY=your-secure-random-secret-key-at-least-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Razorpay Test Credentials
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=xxxxxx

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=https://shopsphere-backend-urqs.onrender.com/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxx
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

---

## 📜 License
Developed for the Lumos Logic Full Stack Developer Internship Assessment.
