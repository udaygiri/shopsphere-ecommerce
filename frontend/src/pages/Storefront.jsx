import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  PackageCheck,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  Heart,
  Loader2,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const Storefront = () => {
  const { isAuthenticated, isAdmin, isSeller } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { success, error: toastError, info } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Filters state
  const selectedCategory = searchParams.get('category') || '';
  const searchKeyword = searchParams.get('search') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  const [inputMinPrice, setInputMinPrice] = useState(minPrice);
  const [inputMaxPrice, setInputMaxPrice] = useState(maxPrice);
  const [sortBy, setSortBy] = useState('newest'); // newest, price-low, price-high
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Keep local price inputs in sync with URL searchParams
  useEffect(() => {
    setInputMinPrice(minPrice);
    setInputMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // 1. Fetch categories for filter pills
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        console.warn('Failed to fetch categories:', err.message);
      }
    };
    fetchCategories();
  }, []);

  // 2. Fetch products whenever category, search, price range, or page changes
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };

      if (selectedCategory) {
        params.category_id = Number(selectedCategory);
      }
      if (searchKeyword.trim()) {
        params.search = searchKeyword.trim();
      }
      if (minPrice) {
        params.min_price = Number(minPrice);
      }
      if (maxPrice) {
        params.max_price = Number(maxPrice);
      }

      const res = await api.get('/products', { params });
      setProducts(res.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchKeyword, minPrice, maxPrice, page, toastError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Category Pill Click
  const handleCategoryClick = (catId) => {
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (!catId || catId === '') {
      newParams.delete('category');
    } else {
      newParams.set('category', catId);
    }
    setSearchParams(newParams);
  };

  // Handle Price Filter Form Submit
  const handleApplyPriceFilter = (e) => {
    e.preventDefault();
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (inputMinPrice.trim() !== '') {
      newParams.set('min_price', inputMinPrice.trim());
    } else {
      newParams.delete('min_price');
    }
    if (inputMaxPrice.trim() !== '') {
      newParams.set('max_price', inputMaxPrice.trim());
    } else {
      newParams.delete('max_price');
    }
    setSearchParams(newParams);
  };

  const handleClearPriceFilter = () => {
    setInputMinPrice('');
    setInputMaxPrice('');
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('min_price');
    newParams.delete('max_price');
    setSearchParams(newParams);
  };

  // Add to cart handler
  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      info('Please sign in to add items to your cart');
      navigate('/login');
      return;
    }

    if (isSeller && !isAdmin) {
      toastError('Sellers cannot add items to cart. Please log in with a customer account.');
      return;
    }

    if (product.stock <= 0) {
      toastError('This product is out of stock.');
      return;
    }

    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      success(`Added "${product.title}" to your cart!`);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to add item to cart');
    } finally {
      setAddingId(null);
    }
  };

  // Toggle wishlist handler
  const handleToggleWishlist = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      info('Please sign in to save items to your wishlist');
      navigate('/login');
      return;
    }

    if (isSeller && !isAdmin) {
      toastError('Sellers cannot create a wishlist. Please use a customer account.');
      return;
    }

    setTogglingId(product.id);
    try {
      const added = await toggleWishlist(product.id);
      if (added) {
        success(`Added "${product.title}" to your wishlist!`);
      } else {
        success(`Removed "${product.title}" from your wishlist`);
      }
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to update wishlist');
    } finally {
      setTogglingId(null);
    }
  };

  // Client-side sorting for display
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 border border-indigo-900/40 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Direct Cloudinary Media & Live Catalog
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Discover Exceptional Products.
          </h1>
          <p className="mt-4 text-slate-300 text-base sm:text-lg">
            Shop directly from verified sellers with atomic inventory, instant order tracking, and role-based management.
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      </section>

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-4">
        
        {/* Category Pills & Price Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => handleCategoryClick('')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                !selectedCategory
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id.toString())}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wider shrink-0 transition-all cursor-pointer ${
                  selectedCategory === cat.id.toString()
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Price Range Filter Form */}
          <form
            onSubmit={handleApplyPriceFilter}
            className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl px-3 py-1.5 self-start lg:self-auto shrink-0 shadow-sm"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>₹</span>
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Min"
              value={inputMinPrice}
              onChange={(e) => setInputMinPrice(e.target.value)}
              className="w-16 sm:w-20 bg-slate-950 text-xs text-white placeholder-slate-500 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500">–</span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Max"
              value={inputMaxPrice}
              onChange={(e) => setInputMaxPrice(e.target.value)}
              className="w-16 sm:w-20 bg-slate-950 text-xs text-white placeholder-slate-500 px-2 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              Filter
            </button>
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={handleClearPriceFilter}
                className="text-xs text-slate-400 hover:text-rose-400 px-1 cursor-pointer"
                title="Clear price filter"
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {/* Toolbar: Active Filters, Count & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            {searchKeyword && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/50 text-indigo-300 text-xs">
                Keyword: "{searchKeyword}"
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('search');
                    setSearchParams(next);
                  }}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/50 text-indigo-300 text-xs">
                Price: {minPrice ? `₹${minPrice}` : '₹0'} – {maxPrice ? `₹${maxPrice}` : 'Any'}
                <button
                  type="button"
                  onClick={handleClearPriceFilter}
                  className="hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            <span>
              Showing <strong className="text-white">{sortedProducts.length}</strong> products
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">Loading catalog items...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="min-h-[40vh] rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center">
          <PackageCheck className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-200">No products found</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1 mb-4">
            We couldn't find any products matching your current category, search, or price criteria.
          </p>
          {(selectedCategory || searchKeyword || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={() => {
                setInputMinPrice('');
                setInputMaxPrice('');
                setSearchParams({});
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 5;
            const isAdding = addingId === product.id;

            return (
              <div
                key={product.id}
                className="group flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all overflow-hidden"
              >
                {/* Product Thumbnail / Image */}
                <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-slate-950">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                      <PackageCheck className="w-10 h-10" />
                      <span className="text-xs">No image provided</span>
                    </div>
                  )}

                  {/* Stock Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-800/60 backdrop-blur-md">
                        <XCircle className="w-3 h-3" /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-800/60 backdrop-blur-md">
                        <AlertTriangle className="w-3 h-3" /> Only {product.stock} Left
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 backdrop-blur-md">
                        <PackageCheck className="w-3 h-3" /> In Stock ({product.stock})
                      </span>
                    )}
                  </div>

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleWishlist(e, product)}
                    disabled={togglingId === product.id}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 hover:bg-slate-800 transition-all cursor-pointer shadow-lg z-10"
                    title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isInWishlist(product.id)
                          ? 'text-rose-500 fill-rose-500'
                          : 'text-slate-400 hover:text-rose-400'
                      }`}
                    />
                  </button>

                  {/* Category Pill on Image */}
                  {product.category && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950/80 text-slate-300 border border-slate-800 backdrop-blur-md">
                        {product.category.name}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/products/${product.id}`}
                      className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 text-base"
                    >
                      {product.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-500 block">Price</span>
                      <span className="text-lg font-bold text-white tracking-tight">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/products/${product.id}`}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={isOutOfStock || isAdding}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md shadow-indigo-600/20'
                        }`}
                      >
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                        <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {products.length >= pageSize && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs font-medium text-slate-400">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Storefront;
