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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Truck className="w-3.5 h-3.5" /> Shipped
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <RotateCcw className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Loading order history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Order History</h1>
        <p className="text-sm text-slate-400 mt-1">Track your past purchases and delivery statuses</p>
      </div>

      {orders.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-slate-800">
          <ShoppingBag className="w-14 h-14 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-1">No Orders Placed Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            You haven't completed any orders yet. Discover items in the catalog to get started.
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20"
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
                className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl"
              >
                {/* Order Summary Top Bar */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="p-5 sm:p-6 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                      #{order.id}
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-base">Order #{order.id}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 block">Total Amount</span>
                      <span className="text-lg font-extrabold text-white">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
                      aria-label="Toggle order details"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-5 border-t border-slate-800/80">
                    
                    {/* Delivery Address */}
                    <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-300">Delivery Address: </span>
                        <span className="text-slate-400">{order.shipping_address}</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Purchased Items ({order.items?.length || 0})
                      </h4>
                      <div className="divide-y divide-slate-800/60 rounded-2xl bg-slate-950/40 border border-slate-800/60 overflow-hidden">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 flex items-center justify-between gap-4 text-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-300 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-200 truncate">{item.product_title}</p>
                                <p className="text-xs text-slate-400">
                                  Qty: {item.quantity} × {formatPrice(item.unit_price)} snapshot
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-white shrink-0">
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
