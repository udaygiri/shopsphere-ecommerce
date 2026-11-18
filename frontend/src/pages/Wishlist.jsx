import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  PackageCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const Wishlist = () => {
  const { wishlist, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isAuthenticated, isSeller, isAdmin } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();

  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      info('Please sign in to add items to your cart');
      navigate('/login');
      return;
    }

    if (isSeller && !isAdmin) {
      toastError('Sellers cannot purchase products. Please use a customer account.');
      return;
    }

    if (product.stock <= 0) {
      toastError('This product is currently out of stock.');
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

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
      success('Removed from wishlist');
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to remove from wishlist');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              My Wishlist
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {wishlist.length} saved {wishlist.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Your wishlist is empty</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            Save items you love to your wishlist and revisit them anytime.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const product = item.product;
            if (!product) return null;

            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 5;
            const isAdding = addingId === product.id;
            const isRemoving = removingId === product.id;

            return (
              <div
                key={item.id}
                className="group flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all overflow-hidden"
              >
                {/* Product Thumbnail */}
                <div className="relative aspect-square overflow-hidden bg-slate-950">
                  <Link to={`/products/${product.id}`}>
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
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </Link>

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

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    disabled={isRemoving}
                    title="Remove from wishlist"
                    className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer shadow-lg"
                  >
                    {isRemoving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/products/${product.id}`}
                      className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 text-base"
                    >
                      {product.title}
                    </Link>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-500 block">Price</span>
                      <span className="text-lg font-bold text-white tracking-tight">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock || isAdding}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                      <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
