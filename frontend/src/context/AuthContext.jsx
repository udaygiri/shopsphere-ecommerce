import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Synchronize user profile from backend whenever token exists
  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (err) {
      console.warn('Failed to verify existing session token:', err.message);
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // Listen for global 401 unauthorized events emitted from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    // 1. Post credentials to obtain JWT
    const tokenRes = await api.post('/auth/login', { email, password });
    const receivedToken = tokenRes.data.access_token;

    // 2. Persist token to state & localStorage
    setToken(receivedToken);
    localStorage.setItem('token', receivedToken);

    // 3. Immediately fetch verified profile using the new token
    const profileRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${receivedToken}` },
    });
    setUser(profileRes.data);
    localStorage.setItem('user', JSON.stringify(profileRes.data));

    return profileRes.data;
  };

  const register = async ({ email, password, full_name, role }) => {
    // 1. Create account (Ensure role is uppercase: CUSTOMER, SELLER, ADMIN)
    const normalizedRole = (role || 'CUSTOMER').toUpperCase();
    await api.post('/auth/register', {
      email,
      password,
      full_name,
      role: normalizedRole,
    });

    // 2. Automatically log user in upon successful registration
    const loggedInUser = await login(email, password);
    return loggedInUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Role check helpers (case-insensitive for rock-solid reliability)
  const isAuthenticated = Boolean(token && user);
  const normalizedRole = user?.role ? String(user.role).toUpperCase() : null;
  const isCustomer = normalizedRole === 'CUSTOMER';
  const isSeller = normalizedRole === 'SELLER';
  const isAdmin = normalizedRole === 'ADMIN';

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    fetchUserProfile,
    isAuthenticated,
    isCustomer,
    isSeller,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
