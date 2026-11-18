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
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-600">Loading your wishlist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              My Wishlist
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {wishlist.length} saved {wishlist.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center max-w-lg mx-auto shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Your wishlist is empty</h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium">
            Save items you love to your wishlist and revisit them anytime.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all active:scale-95"
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
                className="group flex flex-col rounded-3xl bg-white border border-slate-100 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 p-4 sm:p-5 justify-between relative shadow-xs"
              >
                {/* Product Thumbnail */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-3">
                  <Link to={`/products/${product.id}`} className="block w-full h-full p-3 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <PackageCheck className="w-10 h-10 text-slate-300" />
                    )}
                  </Link>

                  {/* Stock Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3 h-3 text-red-600" /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Only {product.stock} Left
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <PackageCheck className="w-3 h-3 text-emerald-600" /> In Stock
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    disabled={isRemoving}
                    title="Remove from wishlist"
                    className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/95 hover:bg-white border border-slate-100 text-slate-400 hover:text-red-500 transition-all cursor-pointer shadow-sm z-10 hover:scale-105"
                  >
                    {isRemoving ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      to={`/products/${product.id}`}
                      className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-sm block"
                    >
                      {product.title}
                    </Link>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Price</span>
                      <span className="text-base sm:text-lg font-black text-blue-600 tracking-tight">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock || isAdding}
                      className={`w-full py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/25'
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