import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  PackageCheck,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Cart = () => {
  const { cart, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();

  const [updatingId, setUpdatingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  // If user is not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Cart is Waiting</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Please sign in to view your cart items, synchronize quantities, and proceed to checkout.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: '/cart' } }}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  // If user is logged in as a seller (not admin or customer)
  if (!isCustomer && !isAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
        <ShieldAlert className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Seller Account Notice</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          Seller accounts manage products and inventory rather than buying items.
        </p>
        <Link
          to="/seller/dashboard"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
        >
          Go to Seller Dashboard
        </Link>
      </div>
    );
  }

  const handleUpdate = async (item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (newQty > item.product.stock) {
      toastError(`Only ${item.product.stock} units available in stock`);
      return;
    }

    setUpdatingId(item.id);
    try {
      await updateQuantity(item.id, newQty);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (item) => {
    setUpdatingId(item.id);
    try {
      await removeFromCart(item.id);
      success(`Removed "${item.product.title}" from cart`);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to remove item');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;
    setClearing(true);
    try {
      await clearCart();
      info('Your shopping cart has been cleared');
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to clear cart');
    } finally {
      setClearing(false);
    }
  };

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isEmpty ? 'Your cart is empty' : `Review ${items.length} items before checkout`}
          </p>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear Cart
          </button>
        )}
      </div>

      {loading && !cart ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">Loading your cart...</p>
        </div>
      ) : isEmpty ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-slate-800">
          <ShoppingBag className="w-14 h-14 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-1">Your cart is currently empty</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Looks like you haven't added any products yet. Browse our storefront catalog to find what you need!
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const isUpdating = updatingId === item.id;
              const product = item.product;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-md"
                >
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                    <Link
                      to={`/products/${product.id}`}
                      className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <PackageCheck className="w-6 h-6" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${product.id}`}
                        className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors text-base line-clamp-1"
                      >
                        {product.title}
                      </Link>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Unit: ${Number(product.price).toFixed(2)}</span>
                        <span>•</span>
                        <span className={product.stock <= 5 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                          {product.stock} in stock
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleUpdate(item, -1)}
                        disabled={item.quantity <= 1 || isUpdating}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-white">
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mx-auto text-indigo-400" /> : item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdate(item, 1)}
                        disabled={item.quantity >= product.stock || isUpdating}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-base font-bold text-white tracking-tight">
                        ${Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={isUpdating}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-800 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Total Items</span>
                <span className="text-white font-medium">{cart?.total_items || 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white font-medium">${Number(cart?.total_price || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Standard Shipping</span>
                <span className="text-emerald-400 font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Tax</span>
                <span className="text-white font-medium">$0.00</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between text-base font-bold text-white">
                <span>Order Total</span>
                <span className="text-indigo-400">${Number(cart?.total_price || 0).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
