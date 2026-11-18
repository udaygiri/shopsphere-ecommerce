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
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">The requested product does not exist or was removed.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Storefront
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left Column: Product Image */}
        <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 aspect-square flex items-center justify-center relative shadow-2xl">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600 gap-3">
              <PackageCheck className="w-16 h-16" />
              <span className="text-sm">No image available</span>
            </div>
          )}

          {/* Stock Tag */}
          <div className="absolute top-4 left-4">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-950/90 text-rose-300 border border-rose-800/80 backdrop-blur-md shadow-lg">
                <XCircle className="w-4 h-4" /> Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-950/90 text-amber-300 border border-amber-800/80 backdrop-blur-md shadow-lg">
                <AlertTriangle className="w-4 h-4" /> Low Stock ({product.stock} available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 backdrop-blur-md shadow-lg">
                <PackageCheck className="w-4 h-4" /> In Stock ({product.stock} units)
              </span>
            )}
          </div>

          {/* Floating Wishlist Button on Image */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            disabled={togglingWishlist}
            className="absolute top-4 right-4 p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 hover:bg-slate-800 transition-all cursor-pointer shadow-xl z-10"
            title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isInWishlist(product.id)
                  ? 'text-rose-500 fill-rose-500'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            />
          </button>
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="flex flex-col space-y-6">
          
          <div>
            {product.category && (
              <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 mb-3">
                {product.category.name}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {product.title}
            </h1>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-slate-500" /> Seller ID: #{product.seller_id}
              </span>
              <span>•</span>
              <span>Added: {new Date(product.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Price */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-slate-400">Per unit / Taxes included</span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
              {product.description || 'No detailed description provided for this product.'}
            </p>
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="space-y-4 pt-2">
            {!isOutOfStock && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Quantity
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock}
                      className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-400">
                    Subtotal: <strong className="text-white">{formatPrice(product.price * quantity)}</strong>
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || adding}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 active:scale-[0.99]'
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
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
                  isInWishlist(product.id)
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-800'
                }`}
                title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Authentic Seller Guaranteed</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300">
              <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Fast Atomic Order Dispatch</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
