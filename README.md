# ShopSphere — Role-Based Full-Stack E-Commerce Platform

A production-grade, role-based e-commerce platform built with **FastAPI** (Python 3.12+) and **React 19** (Vite + Tailwind CSS v4). Features complete multi-tenant role isolation (`CUSTOMER`, `SELLER`, `ADMIN`), atomic checkout, inventory management, Cloudinary media storage, and **Razorpay Payment Gateway integration (Test Mode in Indian Rupee ₹)**.

---

## 🛠️ Tech Stack & Architecture

- **Backend:**
  - **Framework:** FastAPI (Python 3.12+) with `uv` package management
  - **Database:** SQLAlchemy 2.0 ORM, SQLite for local development, PostgreSQL ready for production
  - **Authentication:** JWT (JSON Web Tokens), `bcrypt` password hashing, Role-Based Access Control (RBAC)
  - **Validation & Serialization:** Pydantic v2 & Pydantic Settings
- **Frontend:**
  - **Framework:** React 19, Vite, React Router v7
  - **Styling:** Tailwind CSS v4 with dark mode luxury aesthetic
  - **HTTP Client:** Axios with centralized JWT bearer interceptors and normalized error handling
  - **Icons:** Lucide React
- **Third-Party Integrations:**
  - **Razorpay SDK:** Indian Rupee (`INR ₹`) payment orders, client modal injection, and HMAC-SHA256 signature verification
  - **Cloudinary:** Direct unsigned and server-side image uploads for product catalogs

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Feature / Endpoint | Customer | Seller | Admin |
| :--- | :---: | :---: | :---: |
| **Browse Catalog, Search & Filter** | ✅ | ✅ | ✅ |
| **Manage Shopping Cart** | ✅ | ❌ | ✅ |
| **Razorpay Checkout & Orders** | ✅ | ❌ | ✅ |
| **View Personal Order History** | ✅ | ❌ | ✅ |
| **Create & Manage Own Products** | ❌ | ✅ | ✅ |
| **Cloudinary Image Uploads** | ❌ | ✅ | ✅ |
| **Seller Dashboard & Sales Order Items** | ❌ | ✅ | ✅ |
| **Category Creation (CRUD)** | ❌ | ✅ | ✅ |
| **Category & Product Deletion** | ❌ | ❌ | ✅ |
| **Platform-Wide Salesmen Oversight** | ❌ | ❌ | ✅ |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.12+** and **`uv`**
- **Node.js 18+** and **`npm`**

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment template
cp .env.example .env

# Install dependencies using uv
uv sync

# Launch FastAPI server
uv run uvicorn app.main:app --reload --port 8000
```
- **API Base URL:** `http://localhost:8000/api`
- **Interactive OpenAPI / Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

---

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Copy environment template
cp .env.example .env

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
- **Storefront Web Application:** `http://localhost:5173`

---

## 🔑 Pre-Seeded Demo Credentials

For quick evaluation, test accounts are available:

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@demo.com` | `password123` | Full platform control, category CRUD, salesman oversight |
| **Seller** | `seller@demo.com` | `password123` | Multi-tenant seller dashboard, Cloudinary product uploads |
| **Customer** | `customer@demo.com` | `password123` | Storefront browsing, cart management, Razorpay checkout |

*(The login page includes one-click autofill buttons for each demo role).*

---

## 💳 Razorpay Payment Lifecycle (INR ₹)

1. **Order Initiation (`POST /api/payments/create-order`):**
   - Customer initiates checkout with shipping address.
   - Backend validates real-time inventory stock and converts INR amount to paise (`int(round(amount * 100))`).
   - Generates an official Razorpay Order ID (`order_xxx`).
2. **Frontend Payment Modal (`checkout.js`):**
   - Dynamically loads Razorpay Checkout SDK.
   - Pre-fills customer name, email, and amount in Indian Rupees (`₹`).
   - Customer authorizes transaction using test cards, UPI, or Netbanking.
3. **Cryptographic Verification (`POST /api/payments/verify`):**
   - Modal callback transmits `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
   - Backend computes:
     $$\text{expected\_signature} = \text{HMAC-SHA256}(\text{order\_id} + \text{"\|"} + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
   - On signature match:
     - Atomically decrements product inventory stock.
     - Snapshots unit prices into `OrderItem`.
     - Transitions order to `PROCESSING` with `razorpay_payment_id`.
     - Automatically clears customer's shopping cart.
   - If signature is forged or payment fails:
     - Cleanly rolls back without altering inventory or cart.

---

## 📂 Project Directory Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic environment settings
│   │   │   ├── database.py        # SQLAlchemy engine & session maker
│   │   │   ├── deps.py            # JWT authentication & RBAC guards
│   │   │   ├── razorpay.py        # Razorpay client & signature verification
│   │   │   └── security.py        # bcrypt hashing & JWT token issuance
│   │   ├── models/
│   │   │   ├── cart.py            # Cart & CartItem models
│   │   │   ├── category.py        # Category model with auto-slugs
│   │   │   ├── order.py           # Order & OrderItem models
│   │   │   ├── product.py         # Product model with seller foreign key
│   │   │   └── user.py            # User model & UserRole enum
│   │   ├── routers/
│   │   │   ├── auth.py            # Login, registration, /me profile
│   │   │   ├── cart.py            # Cart CRUD & stock validation
│   │   │   ├── categories.py      # Category CRUD (Admin/Seller)
│   │   │   ├── orders.py          # Customer & Seller order views
│   │   │   ├── payments.py        # Razorpay order create & HMAC verify
│   │   │   └── products.py        # Catalog search, filter, pagination
│   │   ├── schemas/               # Pydantic request & response models
│   │   └── main.py                # FastAPI app, CORS, lifespan seeder
│   ├── pyproject.toml             # uv package dependencies
│   └── .env.example               # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js          # Axios client with JWT interceptor
│   │   │   └── cloudinary.js      # Cloudinary upload handler
│   │   ├── components/
│   │   │   ├── Layout.jsx         # App shell & footer
│   │   │   ├── Navbar.jsx         # Navigation, cart counter, role pills
│   │   │   └── ProtectedRoute.jsx # Role-based route guard
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Session state & token storage
│   │   │   ├── CartContext.jsx    # Live cart badge & items state
│   │   │   └── ToastContext.jsx   # Global toast notifications
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx # Categories CRUD & Salesman products oversight
│   │   │   ├── Cart.jsx           # Quantity updates, item removal, price preview
│   │   │   ├── Checkout.jsx       # Razorpay modal launch & payment verify
│   │   │   ├── Login.jsx          # Login form with 1-click demo autofills
│   │   │   ├── MyOrders.jsx       # Order history with Razorpay payment references
│   │   │   ├── ProductDetail.jsx  # Detailed product view & stock alerts
│   │   │   ├── Register.jsx       # Customer, Seller, and Admin registration
│   │   │   ├── SellerDashboard.jsx# Multi-tenant seller product CRUD & orders
│   │   │   └── Storefront.jsx     # Product catalog, search, category filter
│   │   ├── utils/
│   │   │   ├── currency.js        # Standardized INR (₹) formatting helper
│   │   │   └── razorpay.js        # Dynamic Razorpay checkout.js script loader
│   │   ├── App.jsx                # React routes
│   │   └── main.jsx               # Application entrypoint
│   ├── package.json
│   └── vite.config.js
├── .env.example                   # Combined environment variable reference
├── .gitignore                     # Git ignore rules
└── README.md                      # Platform documentation
```

---

## 🔒 Security & Quality Standards

- **Secure Secrets:** All private credentials (`SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `CLOUDINARY_API_SECRET`) are kept strictly in `.env` and excluded from source control.
- **Strict RBAC Enforcement:** Every administrative, seller, and customer operation is guarded on both the frontend UI and backend API layer.
- **Cryptographic Payment Integrity:** No order transitions to `PROCESSING` without verified HMAC-SHA256 signature verification.
- **Atomic Transactions:** Inventory stock deductions and cart clearances occur atomically inside database transactions with clean rollback on failure.
