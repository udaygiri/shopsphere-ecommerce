import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  // Synchronize cart from backend whenever an eligible user (Customer or Admin) logs in
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || (!isCustomer && !isAdmin)) {
      setCart(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/cart');
      setCart(res.data);
    } catch (err) {
      console.warn('Failed to fetch cart:', err.message);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isCustomer, isAdmin]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    const res = await api.post('/cart/items', {
      product_id: productId,
      quantity,
    });
    setCart(res.data);
    return res.data;
  };

  // Update item quantity
  const updateQuantity = async (itemId, quantity) => {
    const res = await api.put(`/cart/items/${itemId}`, { quantity });
    setCart(res.data);
    return res.data;
  };

  // Remove single line item
  const removeFromCart = async (itemId) => {
    await api.delete(`/cart/items/${itemId}`);
    // Immediately update local state or re-fetch
    await fetchCart();
  };

  // Clear all items from cart
  const clearCart = async () => {
    await api.delete('/cart');
    setCart((prev) => (prev ? { ...prev, items: [], total_price: 0, total_items: 0 } : null));
  };

  // Total count of distinct or accumulated quantities in cart
  const cartCount = cart?.total_items ?? cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;
  const cartTotal = cart?.total_price ?? 0;

  const value = {
    cart,
    loading,
    cartCount,
    cartTotal,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
