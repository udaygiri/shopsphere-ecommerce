import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  Loader2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const MyOrders = () => {
  const { error: toastError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get('/orders/my-orders');
        setOrders(res.data);
      } catch (err) {
        toastError(err.normalizedMessage || 'Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [toastError]);

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const getStatusBadge = (status) => {
    const normalized = (status || '').toUpperCase();
    switch (normalized) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Processing
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3.5 h-3.5 text-indigo-600" /> Shipped
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <RotateCcw className="w-3.5 h-3.5 text-red-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-600">Loading order history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Order History</h1>
        <p className="text-sm text-slate-500 mt-0.5 font-medium">Track your past purchases and delivery statuses</p>
      </div>

      {orders.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-2xs">
          <ShoppingBag className="w-14 h-14 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-1">No Orders Placed Yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            You haven't completed any orders yet. Discover items in the catalog to get started.
          </p>
          <Link
            to="/"
            className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/25 active:scale-95"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const isExpanded = expandedOrders[order.id] !== false; // Default expanded
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="rounded-3xl bg-white border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Order Summary Top Bar */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black text-sm">
                      #{order.id}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-extrabold text-slate-900 text-base">Order #{order.id}</span>
                        {getStatusBadge(order.status)}
                        {order.razorpay_payment_id && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid via Razorpay</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200">
                    <div>
                      <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Total Amount</span>
                      <span className="text-xl font-black text-blue-600">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
                      aria-label="Toggle order details"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-5 bg-white">
                    
                    {/* Delivery Address */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">Delivery Address: </span>
                        <span className="text-slate-600 font-medium">{order.shipping_address}</span>
                      </div>
                    </div>

                    {/* Payment Gateway Reference */}
                    {order.razorpay_payment_id && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span className="text-slate-500">Payment Gateway:</span>
                          <span className="font-bold text-slate-900">Razorpay (Test Mode INR ₹)</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                          <span className="text-slate-500 font-sans font-medium">Payment ID:</span>
                          <span>{order.razorpay_payment_id}</span>
                        </div>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Purchased Items ({order.items?.length || 0})
                      </h4>
                      <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-2xs">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="p-4 flex items-center justify-between gap-4 text-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{item.product_title}</p>
                                <p className="text-xs text-slate-500">
                                  Qty: {item.quantity} × {formatPrice(item.unit_price)} snapshot
                                </p>
                              </div>
                            </div>
                            <span className="font-black text-slate-900 text-base shrink-0">
                              {formatPrice(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;