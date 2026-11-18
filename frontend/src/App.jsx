import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Storefront from './pages/Storefront';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Main Application Shell */}
              <Route path="/" element={<Layout />}>
                {/* Public Storefront & Product Views */}
                <Route index element={<Storefront />} />
                <Route path="products/:id" element={<ProductDetail />} />
                
                {/* Authentication Screens */}
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />

                {/* Shopping Cart (Accessible publicly; enforces customer on checkout) */}
                <Route path="cart" element={<Cart />} />

                {/* Protected Customer Routes */}
                <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="my-orders" element={<MyOrders />} />
                </Route>

                {/* Protected Seller / Admin Multi-tenant Routes */}
                <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
                  <Route path="seller/dashboard" element={<SellerDashboard />} />
                </Route>

                {/* Protected Admin Oversight Routes */}
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                </Route>

                {/* 404 Fallback: Redirect to Storefront */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
