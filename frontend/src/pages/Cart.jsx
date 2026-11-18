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
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

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
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl bg-white border border-slate-100 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Your Cart is Waiting</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6 font-medium">
          Please sign in to view your cart items, synchronize quantities, and proceed to checkout.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: '/cart' } }}
          className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/25 active:scale-95"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  // If user is logged in as a seller (not admin or customer)
  if (!isCustomer && !isAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-white border border-slate-100 shadow-xs">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Seller Account Notice</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-4">
          Seller accounts manage products and inventory rather than buying items.
        </p>
        <Link
          to="/seller/dashboard"
          className="px-6 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 shadow-sm"
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
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEmpty ? 'Your cart is empty' : `Review ${items.length} ${items.length === 1 ? 'item' : 'items'} before checkout`}
          </p>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="self-start sm:self-auto px-4 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear Cart
          </button>
        )}
      </div>

      {loading && !cart ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-600">Loading your cart...</p>
        </div>
      ) : isEmpty ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-2xs">
          <ShoppingBag className="w-14 h-14 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-1">Your cart is currently empty</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Looks like you haven't added any products yet. Browse our storefront catalog to find what you need!
          </p>
          <Link
            to="/"
            className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/25 active:scale-95"
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
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-2xs"
                >
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                    <Link
                      to={`/products/${product.id}`}
                      className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 p-2 flex items-center justify-center"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <PackageCheck className="w-6 h-6 text-slate-300" />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${product.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-base line-clamp-1"
                      >
                        {product.title}
                      </Link>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>Unit: <strong className="text-slate-800">{formatPrice(product.price)}</strong></span>
                        <span>•</span>
                        <span className={product.stock <= 5 ? 'text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full' : 'text-emerald-700 font-bold'}>
                          {product.stock} in stock
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdate(item, -1)}
                        disabled={item.quantity <= 1 || isUpdating}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-900">
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mx-auto text-blue-600" /> : item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdate(item, 1)}
                        disabled={item.quantity >= product.stock || isUpdating}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-base font-black text-blue-600 tracking-tight">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={isUpdating}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 cursor-pointer"
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
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
              </Link>
            </div>
          </div>

          {/* Price Details Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-5 sticky top-24">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
              Order Summary ({items.length} Items)
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Items</span>
                <span className="text-slate-900 font-bold">{cart?.total_items || 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="text-slate-900 font-bold">{formatPrice(cart?.total_price)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charges</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-xs">FREE</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax</span>
                <span className="text-slate-900 font-medium">₹0.00</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between text-lg font-black text-slate-900">
                <span>Total Payable</span>
                <span className="text-blue-600 text-xl">{formatPrice(cart?.total_price)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-4 px-6 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Place Order & Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Safe and Secure Payments • 100% Authentic</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;