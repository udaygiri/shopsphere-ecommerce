import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  Heart,
  Search,
  LogOut,
  Package,
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export const Navbar = () => {
  const { user, isAuthenticated, isCustomer, isSeller, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
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
  const searchInputRef = useRef(null);

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

  const isHome = location.pathname === '/' && !searchParams.get('category') && !searchParams.get('search');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Brand Logo (ShopNext Style in Reference Image) */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex items-center">
              <span className="font-black text-2xl tracking-tight text-slate-900">
                Shop<span className="text-blue-600">Sphere</span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Exact Match to Reference Image Header) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <Link
              to="/"
              className={`relative py-2 transition-colors hover:text-blue-600 ${
                isHome ? 'text-blue-600 font-bold' : ''
              }`}
            >
              Home
              {isHome && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>

            <Link
              to="/"
              className="hover:text-blue-600 transition-colors"
            >
              Shop
            </Link>

            {/* Categories Dropdown */}
            <div className="relative" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer py-2"
              >
                <span>Categories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-slate-100 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('')}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-between"
                  >
                    <span>All Categories</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">All</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 transition-colors truncate"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a
              href="#deals"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              Deals
              <span className="bg-red-500 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full">Hot</span>
            </a>

            {isAuthenticated && (isCustomer || isAdmin) && (
              <Link to="/my-orders" className="hover:text-blue-600 transition-colors">
                My Orders
              </Link>
            )}

            {isAuthenticated && (isSeller || isAdmin) && (
              <Link to="/seller/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1 text-emerald-600 font-bold">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Seller Hub
              </Link>
            )}
          </nav>

          {/* Right Action Icons (Search, Profile, Cart in Reference Image) */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Search Input / Icon Trigger */}
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-44 md:w-56 focus:w-72 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-900 placeholder-slate-400 pl-9 pr-8 py-2 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    navigate('/');
                  }}
                  className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </form>

            {/* Wishlist Heart Icon */}
            {(!isAuthenticated || isCustomer || isAdmin) && (
              <Link
                to="/wishlist"
                className="relative p-2 text-slate-700 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* User / Profile Dropdown (User icon in Reference Image) */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 hover:text-blue-600 transition-all cursor-pointer flex items-center gap-1.5"
                  title="My Account"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200 uppercase">
                    {user?.full_name ? user.full_name[0] : 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-3xl bg-white border border-slate-100 shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-5 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user?.full_name || 'My Account'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {user?.role}
                      </span>
                    </div>

                    <div className="py-1 text-xs font-semibold">
                      {(isCustomer || isAdmin) && (
                        <>
                          <Link
                            to="/wishlist"
                            className="flex items-center gap-2.5 px-5 py-2.5 text-slate-700 hover:text-rose-500 hover:bg-rose-50/50 transition-colors"
                          >
                            <Heart className="w-4 h-4 text-rose-500" />
                            My Wishlist
                          </Link>
                          <Link
                            to="/my-orders"
                            className="flex items-center gap-2.5 px-5 py-2.5 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                          >
                            <Package className="w-4 h-4 text-blue-600" />
                            My Orders
                          </Link>
                        </>
                      )}

                      {(isSeller || isAdmin) && (
                        <Link
                          to="/seller/dashboard"
                          className="flex items-center gap-2.5 px-5 py-2.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                          Seller Dashboard
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center gap-2.5 px-5 py-2.5 text-slate-700 hover:text-amber-700 hover:bg-amber-50/50 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                          Admin Panel
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="p-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Sign In"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            {/* Shopping Cart Icon (with Red Count Badge in Reference Image) */}
            {(!isAuthenticated || isCustomer || isAdmin) && (
              <Link
                to="/cart"
                className="relative p-2 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 md:hidden text-slate-700 hover:text-slate-900 rounded-full hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Expanded Sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 pl-10 pr-16 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="absolute right-1 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-full"
              >
                Go
              </button>
            </form>

            <div className="flex flex-col gap-1 pt-1 text-sm font-semibold text-slate-700">
              <Link to="/" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600">
                Home
              </Link>
              <Link to="/" className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600">
                Shop
              </Link>
              {isAuthenticated && (isCustomer || isAdmin) && (
                <>
                  <Link to="/wishlist" className="px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" /> Wishlist
                    </span>
                    <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                      {wishlistCount}
                    </span>
                  </Link>
                  <Link to="/my-orders" className="px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" /> My Orders
                  </Link>
                </>
              )}
              {isAuthenticated && (isSeller || isAdmin) && (
                <Link to="/seller/dashboard" className="px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-emerald-600">
                  <LayoutDashboard className="w-4 h-4" /> Seller Dashboard
                </Link>
              )}
              {isAuthenticated && isAdmin && (
                <Link to="/admin/dashboard" className="px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-amber-600">
                  <ShieldCheck className="w-4 h-4" /> Admin Panel
                </Link>
              )}
              {!isAuthenticated && (
                <div className="pt-2 flex items-center gap-2">
                  <Link to="/login" className="flex-1 text-center py-2 rounded-full border border-slate-200 text-slate-700 text-xs font-bold">
                    Sign In
                  </Link>
                  <Link to="/register" className="flex-1 text-center py-2 rounded-full bg-blue-600 text-white text-xs font-bold">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;