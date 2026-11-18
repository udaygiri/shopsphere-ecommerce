import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Loader2,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Trash2,
  Package,
  User as UserIcon,
  Eye,
  EyeOff,
  Search,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const AdminDashboard = () => {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'categories' | 'products'

  // Orders & Analytics State
  const [stats, setStats] = useState({
    total_sales: 0,
    total_orders: 0,
    total_products: 0,
    total_users: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Categories State
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [catName, setCatName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState(null);

  // Products State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [togglingProductId, setTogglingProductId] = useState(null);

  // 1. Fetch Categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // 2. Fetch All Platform Products (Across all sellers)
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/products/admin/all');
      setProducts(res.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to fetch platform products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // 3. Fetch Admin Analytics Stats and All Platform Orders
  const fetchAdminStatsAndOrders = async () => {
    setLoadingOrders(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/orders/admin/stats'),
        api.get('/orders/admin/all'),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to fetch admin stats and orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchAdminStatsAndOrders();
    } else if (activeTab === 'categories') {
      fetchCategories();
    } else if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab]);

  // Handle Admin Order Status Update
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      success(`Order #${orderId} status updated to ${newStatus}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: res.data.status } : o))
      );
      // Refresh analytics stats
      const statsRes = await api.get('/orders/admin/stats');
      setStats(statsRes.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Helper to preview slug matching backend logic
  const generatePreviewSlug = (text) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const previewSlug = generatePreviewSlug(catName);

  // Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/categories', {
        name: catName.trim(),
        slug: previewSlug || undefined,
      });
      success(`Category "${res.data.name}" created successfully!`);
      setCatName('');
      fetchCategories();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  // Delete Category (Cascades deletion to all related products)
  const handleDeleteCategory = async (catId, name) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete category "${name}"? All related products in this category will also be deleted.`
      )
    ) {
      return;
    }

    setDeletingCatId(catId);
    try {
      await api.delete(`/categories/${catId}`);
      success(`Category "${name}" and all related products were deleted successfully!`);
      fetchCategories();
      fetchProducts();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to delete category');
    } finally {
      setDeletingCatId(null);
    }
  };

  // Delete Product (Admin privilege)
  const handleDeleteProduct = async (productId, title) => {
    if (!window.confirm(`Are you sure you want to delete product "${title}" from the platform?`)) {
      return;
    }

    setDeletingProductId(productId);
    try {
      await api.delete(`/products/${productId}`);
      success(`Product "${title}" deleted from catalog.`);
      fetchProducts();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  // Toggle Product Visibility
  const handleToggleProductActive = async (product) => {
    setTogglingProductId(product.id);
    try {
      await api.put(`/products/${product.id}`, {
        is_active: !product.is_active,
      });
      success(`Product "${product.title}" is now ${!product.is_active ? 'Active' : 'Hidden'}.`);
      fetchProducts();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to update product visibility');
    } finally {
      setTogglingProductId(null);
    }
  };

  // Filter products by title or seller name
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const term = productSearch.toLowerCase();
    const titleMatch = p.title?.toLowerCase().includes(term);
    const sellerMatch = p.seller?.full_name?.toLowerCase().includes(term) || p.seller?.email?.toLowerCase().includes(term);
    const catMatch = p.category?.name?.toLowerCase().includes(term);
    return titleMatch || sellerMatch || catMatch;
  });

  // Filter orders by ID, customer name, email, or status
  const filteredOrders = orders.filter((o) => {
    if (!orderSearch.trim()) return true;
    const term = orderSearch.toLowerCase();
    const idMatch = o.id.toString().includes(term);
    const userMatch =
      o.user_name?.toLowerCase().includes(term) ||
      o.user_email?.toLowerCase().includes(term);
    const statusMatch = o.status?.toLowerCase().includes(term);
    const addressMatch = o.shipping_address?.toLowerCase().includes(term);
    return idMatch || userMatch || statusMatch || addressMatch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
      case 'SHIPPED':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60';
      case 'PROCESSING':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'CANCELLED':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/60';
      case 'PENDING':
      default:
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Admin Privilege
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            System Administration
          </h1>
          <p className="text-sm text-slate-400">
            Platform revenue analytics, global orders control, categories taxonomy, and catalog oversight
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-px overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>Orders & Analytics ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Categories Management ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-400" />
          <span>All Salesmen Products ({products.length})</span>
        </button>
      </div>

      {/* TAB: Orders & Analytics */}
      {activeTab === 'orders' && (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Platform Sales */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Sales</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {formatPrice(stats.total_sales)}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Paid orders platform revenue
                </p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Orders</span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {stats.total_orders}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  All platform checkouts
                </p>
              </div>
            </div>

            {/* Platform Products */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform Products</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/5">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {stats.total_products}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Active catalog listings
                </p>
              </div>
            </div>

            {/* Registered Users */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform Users</span>
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/5">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {stats.total_users}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Customers, sellers & admins
                </p>
              </div>
            </div>
          </div>

          {/* All Platform Orders Oversight */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  All Platform Orders
                </h2>
                <p className="text-xs text-slate-400">
                  Global orders oversight across all sellers and direct status control
                </p>
              </div>

              {/* Order Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by ID, customer, status..."
                  className="w-full bg-slate-950 text-xs text-white placeholder-slate-500 pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {loadingOrders ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm text-slate-400">Loading platform orders and analytics...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-200">No orders found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {orderSearch ? 'No orders match your search criteria.' : 'No orders have been placed on the platform yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Order Status & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredOrders.map((order) => {
                      const isUpdating = updatingOrderId === order.id;
                      const isPaid = Boolean(order.razorpay_payment_id);

                      return (
                        <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white block">#{order.id}</span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(order.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-100 block truncate max-w-[160px]">
                              {order.user_name || 'Customer'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                              {order.user_email || `User #${order.user_id}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-200 font-medium">
                              {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                            </span>
                            {order.items?.[0] && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                                {order.items[0].product_title || 'Product'}
                                {order.items.length > 1 && ` +${order.items.length - 1} more`}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white text-sm">
                              {formatPrice(order.total_amount)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            ) : order.status === 'CANCELLED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800/60">
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700/60">
                                Pending / COD
                              </span>
                            )}
                            {order.razorpay_payment_id && (
                              <span className="text-[10px] text-slate-500 block truncate max-w-[120px] mt-0.5" title={order.razorpay_payment_id}>
                                {order.razorpay_payment_id}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={order.status}
                                disabled={isUpdating}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${getStatusBadge(order.status)}`}
                              >
                                <option value="PENDING" className="bg-slate-900 text-amber-300">Pending</option>
                                <option value="PROCESSING" className="bg-slate-900 text-blue-300">Processing</option>
                                <option value="SHIPPED" className="bg-slate-900 text-indigo-300">Shipped</option>
                                <option value="DELIVERED" className="bg-slate-900 text-emerald-300">Delivered</option>
                                <option value="CANCELLED" className="bg-slate-900 text-rose-300">Cancelled</option>
                              </select>
                              {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Categories Management */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Create Category Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Add New Category</h2>
                <p className="text-xs text-slate-400">Auto-slug generated for SEO URLs</p>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Smart Home & Automation"
                  className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {catName && (
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400" /> Generated Slug Preview:
                  </span>
                  <span className="font-mono text-indigo-300 font-semibold block break-all">
                    /{previewSlug || 'auto-generated'}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={creating || !catName.trim()}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating category...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Category
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right 2 Columns: Existing Categories List with DELETE button */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Existing Product Categories ({categories.length})
              </h2>
              <button
                type="button"
                onClick={fetchCategories}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Refresh List
              </button>
            </div>

            {loadingCategories ? (
              <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm text-slate-400">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-slate-800 text-center text-slate-400 text-sm">
                No categories found. Use the form to create your first one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const isDeleting = deletingCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                            #{cat.id}
                          </span>
                          <h3 className="font-semibold text-white text-sm truncate">{cat.name}</h3>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1 truncate">
                          slug: <span className="text-indigo-300">{cat.slug}</span>
                        </p>
                      </div>

                      {/* Delete Category Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        disabled={isDeleting}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title={`Delete category "${cat.name}"`}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: All Salesmen Products */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          
          {/* Toolbar: Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by title, salesman name, or category..."
                className="w-full bg-slate-950 text-xs sm:text-sm text-white placeholder-slate-500 pl-10 pr-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>
                Showing <strong className="text-white">{filteredProducts.length}</strong> of{' '}
                <strong className="text-white">{products.length}</strong> total products
              </span>
              <button
                type="button"
                onClick={fetchProducts}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-400">Loading all salesmen products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="min-h-[30vh] rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center">
              <Package className="w-12 h-12 text-slate-600 mb-2" />
              <h3 className="text-base font-bold text-slate-200">No Products Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {productSearch ? 'No products match your search keyword.' : 'No sellers have listed products yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const isDeleting = deletingProductId === product.id;
                const isToggling = togglingProductId === product.id;
                const salesmanName = product.seller?.full_name || `Seller #${product.seller_id}`;
                const salesmanEmail = product.seller?.email || 'N/A';

                return (
                  <div
                    key={product.id}
                    className="flex flex-col rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl"
                  >
                    {/* Thumbnail & Badges */}
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Package className="w-10 h-10" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-950/90 text-indigo-300 border border-slate-800 backdrop-blur-md">
                          {product.category?.name || `Cat #${product.category_id}`}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            product.is_active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Product ID: #{product.id}</span>
                          <span>Stock: {product.stock} units</span>
                        </div>
                        <h3 className="font-bold text-white text-base line-clamp-1">{product.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {product.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Salesman / Seller Information Box */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Salesman / Seller Info:</span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {salesmanName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Email: <span className="text-slate-300">{salesmanEmail}</span>
                        </p>
                      </div>

                      {/* Price & Admin Action Buttons */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block">Price</span>
                          <span className="text-lg font-bold text-white">
                            {formatPrice(product.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Active/Hidden */}
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(product)}
                            disabled={isToggling}
                            className={`p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              product.is_active
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                            title={product.is_active ? 'Hide from catalog' : 'Make active in catalog'}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : product.is_active ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Product */}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            disabled={isDeleting}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
