import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export const Checkout = () => {
  const { cart, fetchCart } = useCart();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const items = cart?.items || [];
  const totalAmount = cart?.total_price || 0;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedAddress = shippingAddress.trim();
    if (trimmedAddress.length < 10) {
      setErrorMsg('Shipping address must be at least 10 characters long.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Your cart is empty. Please add items before placing an order.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/orders/checkout', {
        shipping_address: trimmedAddress,
      });

      // Synchronize cart state
      await fetchCart();

      success(`Order #${res.data.id} placed successfully! Thank you for your purchase.`);
      navigate('/my-orders');
    } catch (err) {
      const msg = err.normalizedMessage || 'Checkout transaction failed. Please try again.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-slate-800">
        <PackageCheck className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">No Items to Checkout</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Your shopping cart has no items. Please select products from the catalog before proceeding to checkout.
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500"
        >
          Return to Storefront
        </Link>
      </div>
    );
  }

  const isAddressValid = shippingAddress.trim().length >= 10;

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      
      {/* Back button */}
      <div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Checkout & Shipping</h1>
        <p className="text-sm text-slate-400 mt-1">Provide delivery details to complete your order</p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="leading-snug">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Cols: Shipping Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" /> Shipping & Delivery Address
                </label>
                <span
                  className={`text-xs ${
                    isAddressValid ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {shippingAddress.trim().length}/10 chars min
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={shippingAddress}
                onChange={(e) => {
                  setShippingAddress(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter your complete delivery address (street, building/apt, city, state, zip code)..."
                className="w-full bg-slate-950 text-sm text-white placeholder-slate-500 p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Must be at least 10 characters long to ensure reliable delivery verification.
              </p>
            </div>

            {/* Payment Method Preview */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" /> Payment Strategy
              </h3>
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-indigo-100">Standard Test Order Mode</p>
                  <p className="mt-0.5 text-slate-300">
                    Live atomic transaction directly validates inventory, snapshots historical pricing, and initiates order processing. (Razorpay integration scheduled for Task 7).
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isAddressValid}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing atomic checkout...
                </>
              ) : (
                <>
                  <span>Place Order (${Number(totalAmount).toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Col: Order Summary */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight">Order Items ({items.length})</h2>

          <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-200 truncate">{item.product.title}</p>
                  <p className="text-slate-400">
                    {item.quantity} × ${Number(item.product.price).toFixed(2)}
                  </p>
                </div>
                <span className="font-semibold text-white shrink-0">
                  ${Number(item.subtotal).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="text-white">${Number(totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Shipping</span>
              <span className="text-emerald-400 font-medium">Free</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
              <span>Total</span>
              <span className="text-indigo-400">${Number(totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
