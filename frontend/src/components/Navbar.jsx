import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  LogOut,
  Package,
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export const Navbar = () => {
  const { user, isAuthenticated, isCustomer, isSeller, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const categoryMenuRef = useRef(null);

  // Keep search bar in sync with URL search param
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  // Fetch categories for category navigation
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        console.warn('Failed to load categories in navbar:', err.message);
      }
    };
    fetchCats();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setCategoryDropdownOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/');
    }
  };

  const handleSelectCategory = (catId) => {
    setCategoryDropdownOpen(false);
    if (!catId) {
      navigate('/');
    } else {
      navigate(`/?category=${catId}`);
    }
  };

  const handleLogout = () => {
    logout();
    success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                ShopSphere
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-indigo-400 -mt-1">
                E-Commerce
              </span>
            </div>
          </Link>

          {/* Category Dropdown (Desktop) */}
          <div className="hidden lg:relative lg:block" ref={categoryMenuRef}>
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Categories</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  type="button"
                  onClick={() => handleSelectCategory('')}
                  className="w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 hover:bg-slate-800/80 transition-colors"
                >
                  All Categories
                </button>
                <div className="border-t border-slate-800/80 my-1" />
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors truncate"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-lg items-center relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title or description..."
              className="w-full bg-slate-900/90 text-sm text-slate-100 placeholder-slate-500 pl-10 pr-20 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  navigate('/');
                }}
                className="absolute right-12 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Cart Icon (Customer or Guest or Admin) */}
            {(!isAuthenticated || isCustomer || isAdmin) && (
              <Link
                to="/cart"
                className="relative p-2.5 text-slate-300 hover:text-white rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
                title="View Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg ring-2 ring-slate-950 animate-in zoom-in-50">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth Buttons or User Profile Dropdown */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 text-slate-200 text-sm font-medium transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-500/30">
                    {user?.full_name ? user.full_name[0] : 'U'}
                  </div>
                  <span className="hidden sm:inline-block max-w-[120px] truncate">
                    {user?.full_name?.split(' ')[0] || user?.email}
                  </span>
                  <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                    {user?.role}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {user?.full_name || 'My Account'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                        Role: {user?.role}
                      </span>
                    </div>

                    <div className="py-1">
                      {/* Customer / Admin Links */}
                      {(isCustomer || isAdmin) && (
                        <Link
                          to="/my-orders"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                        >
                          <Package className="w-4 h-4 text-indigo-400" />
                          My Orders
                        </Link>
                      )}

                      {/* Seller / Admin Links */}
                      {(isSeller || isAdmin) && (
                        <Link
                          to="/seller/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                          Seller Dashboard
                        </Link>
                      )}

                      {/* Admin-only Links */}
                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          Admin Panel
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 md:hidden text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search & Menu Expand */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-800 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-slate-900 text-sm text-slate-100 placeholder-slate-500 pl-9 pr-16 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg"
              >
                Go
              </button>
            </form>

            <div className="flex flex-col gap-1 pt-1">
              <Link
                to="/"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                All Products
              </Link>
              {isAuthenticated && (isCustomer || isAdmin) && (
                <Link
                  to="/my-orders"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  My Orders
                </Link>
              )}
              {isAuthenticated && (isSeller || isAdmin) && (
                <Link
                  to="/seller/dashboard"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Seller Dashboard
                </Link>
              )}
              {isAuthenticated && isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
