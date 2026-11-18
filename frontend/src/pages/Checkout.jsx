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
  Lock,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';
import { loadRazorpayScript } from '../utils/razorpay';

export const Checkout = () => {
  const { cart, fetchCart } = useCart();
  const { success, error: toastError, info: toastInfo } = useToast();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fallback offline mock payment modal state
  const [mockModalData, setMockModalData] = useState(null);

  const items = cart?.items || [];
  const totalAmount = cart?.total_price || 0;

  const handleVerifyPayment = async (verifyPayload) => {
    try {
      const res = await api.post('/payments/verify', verifyPayload);

      // Synchronize cart state
      await fetchCart();

      const orderId = res.data?.order?.id;
      const paymentRef = verifyPayload.razorpay_payment_id;
      success(`Order #${orderId} confirmed successfully! Payment ID: ${paymentRef}`);
      navigate('/my-orders');
    } catch (err) {
      const msg = err.normalizedMessage || 'Payment verification failed. Please try again.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
      setMockModalData(null);
    }
  };

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
      // 1. Create order on backend (converts INR to paise and contacts Razorpay)
      const res = await api.post('/payments/create-order', {
        shipping_address: trimmedAddress,
      });

      const orderData = res.data;
      const scriptLoaded = await loadRazorpayScript();

      // 2. If live Razorpay checkout script is available on window
      if (scriptLoaded && window.Razorpay) {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount, // in paise
          currency: orderData.currency || 'INR',
          name: 'Role-Based E-Commerce',
          description: `Checkout (${items.length} items)`,
          image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          order_id: orderData.razorpay_order_id,
          prefill: {
            name: orderData.customer_name || '',
            email: orderData.customer_email || '',
          },
          notes: {
            shipping_address: trimmedAddress,
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response) {
            await handleVerifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              shipping_address: trimmedAddress,
            });
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              toastInfo('Payment dismissed. Your cart items are preserved.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setSubmitting(false);
          const failReason = resp.error?.description || 'Payment was declined or cancelled.';
          setErrorMsg(failReason);
          toastError(failReason);
        });
        rzp.open();
      } else {
        // 3. Fallback Test Mode Simulation (for offline dev or when external script is blocked)
        setMockModalData({
          order_id: orderData.razorpay_order_id,
          amount_in_rupees: orderData.amount_in_rupees || totalAmount,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          shipping_address: trimmedAddress,
        });
      }
    } catch (err) {
      setSubmitting(false);
      const msg = err.normalizedMessage || 'Could not initiate Razorpay order. Please try again.';
      setErrorMsg(msg);
      toastError(msg);
    }
  };

  const handleSimulateMockSuccess = async () => {
    if (!mockModalData) return;
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const mockSignature = `mock_sig_${Date.now()}`;

    await handleVerifyPayment({
      razorpay_order_id: mockModalData.order_id,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
      shipping_address: mockModalData.shipping_address,
    });
  };

  const handleSimulateMockFailure = () => {
    setSubmitting(false);
    setMockModalData(null);
    const msg = 'Payment authorization declined by simulated gateway.';
    setErrorMsg(msg);
    toastError(msg);
  };

  const handleDismissMockModal = () => {
    setSubmitting(false);
    setMockModalData(null);
    toastInfo('Payment cancelled. Your cart items remain intact.');
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
          <form
            onSubmit={handleSubmitOrder}
            className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" /> Shipping & Delivery Address
                </label>
                <span className={`text-xs ${isAddressValid ? 'text-emerald-400' : 'text-slate-400'}`}>
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

            {/* Razorpay Payment Method Box */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" /> Payment Gateway
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  <Lock className="w-3 h-3 text-indigo-400" /> Razorpay Test Mode (INR ₹)
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-200 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-indigo-100">Cryptographically Verified Checkout</p>
                    <p className="mt-0.5 text-slate-300 leading-relaxed">
                      Transactions are processed in Indian Rupees (₹). Once authorized, the backend cryptographically
                      validates the HMAC-SHA256 signature before deducting live inventory.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-900/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Test Cards, UPI & Netbanking supported
                  </span>
                  <span className="text-indigo-400 font-medium">Zero KYC Required</span>
                </div>
              </div>
            </div>

            {/* Razorpay Pay Button */}
            <button
              type="submit"
              disabled={submitting || !isAddressValid}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Razorpay checkout...</span>
                </>
              ) : (
                <>
                  <span>Pay with Razorpay ({formatPrice(totalAmount)})</span>
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
                    {item.quantity} × {formatPrice(item.product.price)}
                  </p>
                </div>
                <span className="font-semibold text-white shrink-0">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="text-white">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Shipping</span>
              <span className="text-emerald-400 font-medium">Free</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
              <span>Total Amount</span>
              <span className="text-indigo-400">{formatPrice(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline / Test Mode Simulated Gateway Dialog */}
      {mockModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Razorpay Test Gateway</h3>
                  <p className="text-xs text-slate-400">Simulated Payment Authorization</p>
                </div>
              </div>
              <button
                onClick={handleDismissMockModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Razorpay Order ID:</span>
                <code className="text-indigo-300 font-mono">{mockModalData.order_id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="text-slate-200">{mockModalData.customer_name || 'Valued Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency & Amount:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatPrice(mockModalData.amount_in_rupees)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This simulated modal verifies atomic inventory deduction and cryptographic backend signature
              verification without requiring third-party network access.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSimulateMockSuccess}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Simulate Successful Payment
              </button>
              <button
                type="button"
                onClick={handleSimulateMockFailure}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" /> Simulate Declined Payment
              </button>
              <button
                type="button"
                onClick={handleDismissMockModal}
                className="w-full py-2 px-4 rounded-xl font-medium text-xs text-slate-400 hover:text-white transition-colors"
              >
                Dismiss Modal (Keep Cart Intact)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
