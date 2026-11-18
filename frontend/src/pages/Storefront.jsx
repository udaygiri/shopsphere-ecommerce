import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  PackageCheck,
  ShoppingCart,
  Heart,
  Loader2,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Star,
  Truck,
  ShieldCheck,
  Headphones,
  Laptop,
  Watch,
  Footprints,
  Flame,
  Gift,
  ArrowRight,
  Tv,
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
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Keep local price inputs in sync with URL searchParams
  useEffect(() => {
    setInputMinPrice(minPrice);
    setInputMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // 1. Fetch categories
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

  // 2. Fetch products
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

  // Handle Category Click
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

  // Pre-configured category icons for curated showcase
  const categoryIconMap = {
    electronics: Laptop,
    audio: Headphones,
    music: Headphones,
    wearables: Watch,
    watch: Watch,
    fashion: Footprints,
    shoes: Footprints,
    home: Tv,
    appliances: Tv,
    beauty: Sparkles,
  };

  const getCategoryIcon = (name) => {
    const key = name?.toLowerCase() || '';
    for (const [k, IconComponent] of Object.entries(categoryIconMap)) {
      if (key.includes(k)) return IconComponent;
    }
    return Laptop;
  };

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      
      {/* 1. HERO SECTION (Exact Match to Reference Image Header & Visual) */}
      <section className="relative overflow-hidden rounded-3xl sm:rounded-[36px] bg-gradient-to-br from-[#e8f1ff] via-[#f1f6ff] to-[#fff7ea] border border-blue-100 p-8 sm:p-14 lg:p-16 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Text Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/90 text-blue-700 text-xs font-bold shadow-2xs border border-blue-200/80">
              <span>🏷️</span>
              <span>Big Savings, Bigger Smiles!</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Shop Smarter.{' '}
              <span className="text-blue-600 block">Live Better.</span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg max-w-lg font-medium leading-relaxed">
              Discover amazing products, unbeatable prices, and fast delivery directly from verified merchants.
            </p>

            <div>
              <a
                href="#deals"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" /> Free Shipping
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Secure Payments
              </span>
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-blue-600" /> 24/7 Support
              </span>
            </div>
          </div>

          {/* Right Hero Graphic Showcase (Matching Girl + Cart + 50% OFF Tag) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Background glowing yellow circle */}
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-amber-300/40 blur-2xl pointer-events-none" />
            <div className="absolute -top-6 -right-6 w-48 h-48 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden bg-gradient-to-tr from-blue-600/10 via-amber-200/20 to-transparent p-6 flex flex-col items-center justify-center">
              
              {/* Floating "50% OFF" Tag (Exact match to Reference Image) */}
              <div className="absolute top-4 right-4 z-20 bg-red-500 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-red-500/30 flex flex-col items-center leading-tight rotate-6 animate-pulse">
                <span className="text-lg sm:text-xl">50%</span>
                <span className="text-[10px] tracking-wider uppercase font-bold">OFF</span>
              </div>

              {/* Shopping composition graphic with gift boxes & cart */}
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-28 h-28 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-4 transform -rotate-3 hover:rotate-0 transition-transform">
                  <ShoppingCart className="w-14 h-14" />
                </div>
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                  <Gift className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800">Festive Deals & Fast Shipping</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SHOP BY CATEGORY SECTION (Exact Match to Reference Image Row) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-100/90">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Section Heading with cursive "Find what you love" */}
          <div className="shrink-0">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Shop by{' '}
              <span className="text-blue-600">Category</span>
            </h2>
            <p className="font-handwriting text-amber-500 text-xl font-bold tracking-wide mt-0.5">
              Find what you love
            </p>
          </div>

          {/* Category Circles (Circular cards in reference image) */}
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin">
            {/* "All" category circle */}
            <button
              type="button"
              onClick={() => handleCategoryClick('')}
              className="flex flex-col items-center gap-2 group cursor-pointer shrink-0"
            >
              <div
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 border ${
                  !selectedCategory
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 scale-105'
                    : 'bg-blue-50/70 hover:bg-blue-100 text-blue-600 border-blue-100 hover:scale-105'
                }`}
              >
                <Sparkles className="w-7 h-7" />
              </div>
              <span
                className={`text-xs font-bold ${
                  !selectedCategory ? 'text-blue-600 font-black' : 'text-slate-700 group-hover:text-blue-600'
                }`}
              >
                All Products
              </span>
            </button>

            {/* Dynamic Categories */}
            {categories.map((cat) => {
              const IconComp = getCategoryIcon(cat.name);
              const isSelected = selectedCategory === cat.id.toString();

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id.toString())}
                  className="flex flex-col items-center gap-2 group cursor-pointer shrink-0"
                >
                  <div
                    className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 scale-105'
                        : 'bg-blue-50/70 hover:bg-blue-100 text-blue-600 border-blue-100 hover:scale-105'
                    }`}
                  >
                    <IconComp className="w-7 h-7" />
                  </div>
                  <span
                    className={`text-xs font-bold max-w-[85px] truncate text-center ${
                      isSelected ? 'text-blue-600 font-black' : 'text-slate-700 group-hover:text-blue-600'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. HOT DEALS / BEST DEALS SECTION */}
      <section id="deals" className="space-y-6">
        
        {/* Header Bar with Countdown Timer (Exact Match to Reference Image) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
              <Flame className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>Hot Deals</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Don't Miss Our Best Deals!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Top-rated products at unbeatable prices.
            </p>

            <button
              type="button"
              onClick={() => {
                setInputMinPrice('');
                setInputMaxPrice('');
                setSearchParams({});
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer mt-1"
            >
              <span>View All Deals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Countdown Timer Boxes (01 Days | 12 Hours | 34 Min | 56 Sec) */}
          <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto">
            <div className="w-14 sm:w-16 py-2.5 rounded-2xl bg-blue-50/90 border border-blue-100 text-center shadow-2xs">
              <span className="font-black text-blue-700 text-base sm:text-lg block leading-none">01</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Days</span>
            </div>
            <div className="w-14 sm:w-16 py-2.5 rounded-2xl bg-blue-50/90 border border-blue-100 text-center shadow-2xs">
              <span className="font-black text-blue-700 text-base sm:text-lg block leading-none">12</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Hours</span>
            </div>
            <div className="w-14 sm:w-16 py-2.5 rounded-2xl bg-blue-50/90 border border-blue-100 text-center shadow-2xs">
              <span className="font-black text-blue-700 text-base sm:text-lg block leading-none">34</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Min</span>
            </div>
            <div className="w-14 sm:w-16 py-2.5 rounded-2xl bg-blue-50/90 border border-blue-100 text-center shadow-2xs">
              <span className="font-black text-blue-700 text-base sm:text-lg block leading-none">56</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Sec</span>
            </div>
          </div>
        </div>

        {/* Filter and Control Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Price Range Filter Form */}
          <form onSubmit={handleApplyPriceFilter} className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>₹</span>
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Min"
              value={inputMinPrice}
              onChange={(e) => setInputMinPrice(e.target.value)}
              className="w-20 bg-slate-50 text-xs font-semibold text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Max"
              value={inputMaxPrice}
              onChange={(e) => setInputMaxPrice(e.target.value)}
              className="w-20 bg-slate-50 text-xs font-semibold text-slate-900 placeholder-slate-400 px-3 py-1.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Filter
            </button>
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={handleClearPriceFilter}
                className="text-xs text-slate-500 hover:text-red-500 px-2 font-bold cursor-pointer"
              >
                Reset
              </button>
            )}
          </form>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" /> Sort:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-full px-4 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid (Exact Card Styling matching the 4 product cards in reference image) */}
        {loading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-bold text-slate-600">Loading catalog items...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="min-h-[40vh] rounded-3xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-8 text-center shadow-2xs">
            <PackageCheck className="w-14 h-14 text-slate-300 mb-3" />
            <h3 className="text-xl font-bold text-slate-900">No products found</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">
              We couldn't find any products matching your current criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setInputMinPrice('');
                setInputMaxPrice('');
                setSearchParams({});
              }}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedProducts.map((product, idx) => {
              const isOutOfStock = product.stock <= 0;
              const isAdding = addingId === product.id;
              
              // Dynamic discount tags like -40%, -35%, -50%, -30% in reference image
              const discountPercentages = ['-40%', '-35%', '-50%', '-30%', '-25%', '-45%'];
              const discountTag = discountPercentages[idx % discountPercentages.length];
              const originalPrice = Math.round(product.price * 1.4);

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-3xl border border-slate-100 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between relative shadow-xs"
                >
                  {/* Top Bar on Product Card: Discount Pill + Wishlist Button */}
                  <div className="relative aspect-square rounded-2xl bg-slate-50/70 overflow-hidden mb-3">
                    
                    {/* Red Discount Pill (Exact Match to Reference Image: -40%, -35%, etc.) */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="bg-red-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
                        {discountTag}
                      </span>
                    </div>

                    {/* Wishlist Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(e, product)}
                      disabled={togglingId === product.id}
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/95 hover:bg-white text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-all z-10 cursor-pointer"
                      title="Save to Wishlist"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                    </button>

                    {/* Product Image */}
                    <Link to={`/products/${product.id}`} className="w-full h-full flex items-center justify-center p-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <PackageCheck className="w-12 h-12 text-slate-300" />
                      )}
                    </Link>
                  </div>

                  {/* Rating Line: ⭐ 4.8 (12k+) */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>4.8</span>
                      <span className="text-slate-400 text-[11px] font-medium">(12k+)</span>
                    </div>

                    {/* Product Title */}
                    <Link
                      to={`/products/${product.id}`}
                      className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-sm block"
                    >
                      {product.title}
                    </Link>

                    {/* Price Row: Bold Blue Price + Strikethrough Original Price */}
                    <div className="flex items-baseline gap-2 pt-1 pb-3">
                      <span className="text-base sm:text-lg font-black text-blue-600">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs text-slate-400 line-through font-medium">
                        {formatPrice(originalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Add to Cart Button (Exact Royal Blue Pill in Reference Image) */}
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={isOutOfStock || isAdding}
                    className={`w-full py-2.5 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                      isOutOfStock
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-blue-600/25'
                    }`}
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {products.length >= pageSize && (
          <div className="flex items-center justify-center gap-3 pt-6">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-5 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-700 bg-white px-4 py-2 rounded-full border border-slate-200">
              Page {page}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-5 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* 4. SPECIAL OFFER PROMO BANNER (Exact Match to Deep Blue Promo in Reference Image) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-8 sm:p-12 shadow-xl border border-blue-800/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-800/80 text-amber-300 text-xs font-bold border border-amber-400/30">
              <span>🎁</span>
              <span>Special Offer</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Get <span className="text-amber-400">20% OFF</span> on your first order!
            </h2>

            {/* Promo Code Box (Dashed yellow border in Reference Image) */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="border-2 border-dashed border-amber-400/80 bg-blue-900/60 rounded-2xl px-5 py-2 text-center shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Use Code:</span>
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono tracking-wider">
                  WELCOME20
                </span>
              </div>

              {/* Yellow Pill Button: Shop Now → */}
              <a
                href="#deals"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Gadget Graphic (Headphones, smartphone, smartwatch, earbuds, gifts) */}
          <div className="lg:col-span-4 flex items-center justify-center relative">
            <div className="w-40 h-40 rounded-full bg-blue-500/20 blur-2xl absolute" />
            <div className="relative p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                <Gift className="w-8 h-8" />
              </div>
              <div className="text-left">
                <p className="text-xs uppercase font-bold text-amber-300">Limited Period Offer</p>
                <p className="text-sm font-bold text-white">Save on Top Audio, Mobile & Tech</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative blur elements */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </section>
    </div>
  );
};

export default Storefront;