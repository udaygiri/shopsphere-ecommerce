import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch user wishlist from backend
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated || (!isCustomer && !isAdmin)) {
      setWishlist([]);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/wishlist');
      setWishlist(res.data);
    } catch (err) {
      console.warn('Failed to fetch wishlist:', err.message);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isCustomer, isAdmin]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Check if a specific product is currently saved in the wishlist
  const isInWishlist = useCallback(
    (productId) => {
      return wishlist.some((item) => item.product_id === productId);
    },
    [wishlist]
  );

  // Add product to wishlist
  const addToWishlist = async (productId) => {
    const res = await api.post(`/wishlist/${productId}`);
    setWishlist((prev) => {
      const exists = prev.some((item) => item.product_id === productId);
      if (exists) return prev;
      return [res.data, ...prev];
    });
    return res.data;
  };

  // Remove product from wishlist
  const removeFromWishlist = async (productId) => {
    await api.delete(`/wishlist/${productId}`);
    setWishlist((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Toggle wishlist state (add if absent, remove if present)
  const toggleWishlist = async (productId) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
      return false; // Removed
    } else {
      await addToWishlist(productId);
      return true; // Added
    }
  };

  const wishlistCount = wishlist.length;

  const value = {
    wishlist,
    loading,
    wishlistCount,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    fetchWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
