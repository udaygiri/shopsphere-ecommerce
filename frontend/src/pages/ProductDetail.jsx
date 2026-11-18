import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  PackageCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  ShieldCheck,
  Truck,
  Store,
  Plus,
  Minus,
  Star,
  CheckCircle2,
  Headphones,
  RotateCcw,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isSeller } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { success, error: toastError, info } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        toastError(err.normalizedMessage || 'Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, toastError]);

  const handleQuantityChange = (delta) => {
    if (!product) return;
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > product.stock) return product.stock;
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      info('Please sign in to add items to your cart');
      navigate('/login');
      return;
    }

    if (isSeller && !isAdmin) {
      toastError('Sellers cannot purchase products. Please log in with a customer account.');
      return;
    }

    if (!product || product.stock <= 0) {
      toastError('This product is out of stock');
      return;
    }

    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      success(`Added ${quantity} × "${product.title}" to your cart!`);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to add item to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      info('Please sign in to save items to your wishlist');
      navigate('/login');
      return;
    }

    if (isSeller && !isAdmin) {
      toastError('Sellers cannot create a wishlist. Please use a customer account.');
      return;
    }

    if (!product) return;

    setTogglingWishlist(true);
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
      setTogglingWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-600">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-100 p-12 shadow-2xs">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">The requested product does not exist or was removed.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const originalPrice = Math.round(product.price * 1.4);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Storefront
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Product Image Card */}
        <div className="rounded-3xl overflow-hidden bg-white border border-slate-100 aspect-square flex items-center justify-center relative shadow-sm">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-contain p-6"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
              <PackageCheck className="w-16 h-16 text-slate-300" />
              <span className="text-sm font-medium">No image available</span>
            </div>
          )}

          {/* Stock Tag / Discount Tag */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <span className="bg-red-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-2xs">
              -35% OFF
            </span>
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Only {product.stock} Left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" /> In Stock ({product.stock})
              </span>
            )}
          </div>

          {/* Floating Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            disabled={togglingWishlist}
            className="absolute top-4 right-4 p-3 rounded-full bg-white hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer shadow-md z-10 hover:scale-105 active:scale-95"
            title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isInWishlist(product.id)
                  ? 'text-red-500 fill-red-500'
                  : 'text-slate-400 hover:text-red-500'
              }`}
            />
          </button>
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="flex flex-col space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs">
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.category && (
                <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {product.category.name}
                </span>
              )}
              <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>4.8</span>
                <span className="text-slate-400 font-medium">(12k+ reviews)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {product.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Store className="w-4 h-4 text-blue-600" /> Seller ID: #{product.seller_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Merchant
              </span>
              <span>•</span>
              <span>Added: {new Date(product.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Special Price Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/80 border border-blue-100 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                Special Offer Price
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-blue-600 tracking-tight">
                  {formatPrice(product.price)}
                </span>
                <span className="text-sm text-slate-400 line-through font-medium">
                  {formatPrice(originalPrice)}
                </span>
                <span className="text-xs font-black text-white bg-red-500 px-2 py-0.5 rounded-full">
                  SAVE 35%
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-500">Taxes included • Free Delivery</span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Product Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              {product.description || 'No detailed description provided for this product.'}
            </p>
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="space-y-4 pt-2">
            {!isOutOfStock && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Quantity
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-black text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                      className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    Subtotal: <strong className="text-blue-600 text-sm font-black">{formatPrice(product.price * quantity)}</strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || adding}
                className={`flex-1 py-4 px-6 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-98'
                }`}
              >
                {adding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding to cart...
                  </>
                ) : isOutOfStock ? (
                  <>
                    <XCircle className="w-5 h-5" />
                    Sold Out
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add {quantity > 1 ? `${quantity} Items` : 'to Cart'} • {formatPrice(product.price * quantity)}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={togglingWishlist}
                className={`p-4 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                  isInWishlist(product.id)
                    ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-red-500 hover:border-slate-300 hover:bg-slate-100'
                }`}
                title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Authentic Seller Guaranteed</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60 text-xs text-slate-700">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Fast Atomic Order Dispatch</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60 text-xs text-slate-700">
              <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Easy Order Cancellation</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60 text-xs text-slate-700">
              <Headphones className="w-4 h-4 text-blue-600 shrink-0" />
              <span>24/7 Dedicated Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;