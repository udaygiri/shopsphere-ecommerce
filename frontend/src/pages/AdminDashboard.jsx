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
  ShieldCheck,
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
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'PROCESSING':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'PENDING':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Admin Privilege
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            System Administration
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Platform revenue analytics, global orders control, categories taxonomy, and catalog oversight
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Orders & Analytics ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Categories Management ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>All Salesmen Products ({products.length})</span>
        </button>
      </div>

      {/* TAB: Orders & Analytics */}
      {activeTab === 'orders' && (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Platform Sales */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sales</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {formatPrice(stats.total_sales)}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Paid orders platform revenue
                </p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders</span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {stats.total_orders}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  All platform checkouts
                </p>
              </div>
            </div>

            {/* Platform Products */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Products</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {stats.total_products}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Active catalog listings
                </p>
              </div>
            </div>

            {/* Registered Users */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Users</span>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {stats.total_users}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Customers, sellers & admins
                </p>
              </div>
            </div>
          </div>

          {/* All Platform Orders Oversight */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  All Platform Orders
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Global orders oversight across all sellers and direct status control
                </p>
              </div>

              {/* Order Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by ID, customer, status..."
                  className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {loadingOrders ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-bold text-slate-600">Loading platform orders and analytics...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No orders found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {orderSearch ? 'No orders match your search criteria.' : 'No orders have been placed on the platform yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4 rounded-l-2xl">Order ID & Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 rounded-r-2xl">Order Status & Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredOrders.map((order) => {
                      const isUpdating = updatingOrderId === order.id;
                      const isPaid = Boolean(order.razorpay_payment_id);

                      return (
                        <tr key={order.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-extrabold text-slate-900 block">#{order.id}</span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {new Date(order.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block truncate max-w-[160px]">
                              {order.user_name || 'Customer'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                              {order.user_email || `User #${order.user_id}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-900 font-bold">
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
                            <span className="font-black text-blue-600 text-sm">
                              {formatPrice(order.total_amount)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            ) : order.status === 'CANCELLED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                Pending / COD
                              </span>
                            )}
                            {order.razorpay_payment_id && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[120px] mt-0.5" title={order.razorpay_payment_id}>
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
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${getStatusBadge(order.status)}`}
                              >
                                <option value="PENDING" className="bg-white text-amber-800">Pending</option>
                                <option value="PROCESSING" className="bg-white text-blue-800">Processing</option>
                                <option value="SHIPPED" className="bg-white text-indigo-800">Shipped</option>
                                <option value="DELIVERED" className="bg-white text-emerald-800">Delivered</option>
                                <option value="CANCELLED" className="bg-white text-red-800">Cancelled</option>
                              </select>
                              {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
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
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Add New Category</h2>
                <p className="text-xs text-slate-400 font-medium">Auto-slug generated for SEO URLs</p>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Smart Home & Automation"
                  className="w-full bg-slate-50 text-sm text-slate-900 px-4 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {catName && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs space-y-1">
                  <span className="text-slate-600 flex items-center gap-1.5 font-bold">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" /> Generated Slug Preview:
                  </span>
                  <span className="font-mono text-blue-700 font-bold block break-all">
                    /{previewSlug || 'auto-generated'}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={creating || !catName.trim()}
                className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Existing Product Categories ({categories.length})
              </h2>
              <button
                type="button"
                onClick={fetchCategories}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
              >
                Refresh List
              </button>
            </div>

            {loadingCategories ? (
              <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-bold text-slate-600">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 bg-white text-center text-slate-400 text-sm font-medium">
                No categories found. Use the form to create your first one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const isDeleting = deletingCatId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-xs font-bold shrink-0">
                            #{cat.id}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm truncate">{cat.name}</h3>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-1 truncate">
                          slug: <span className="text-blue-600 font-bold">{cat.slug}</span>
                        </p>
                      </div>

                      {/* Delete Category Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        disabled={isDeleting}
                        className="p-2 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-slate-100 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by title, salesman name, or category..."
                className="w-full bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder-slate-400 pl-11 pr-4 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Showing <strong className="text-slate-900 font-bold">{filteredProducts.length}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{products.length}</strong> total products
              </span>
              <button
                type="button"
                onClick={fetchProducts}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-bold text-slate-600">Loading all salesmen products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="min-h-[30vh] rounded-3xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-8 text-center shadow-2xs">
              <Package className="w-12 h-12 text-slate-300 mb-2" />
              <h3 className="text-base font-bold text-slate-900">No Products Found</h3>
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
                    className="flex flex-col rounded-3xl bg-white border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail & Badges */}
                    <div className="relative aspect-video bg-slate-50 overflow-hidden flex items-center justify-center p-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Package className="w-10 h-10 text-slate-300" />
                      )}

                      <div className="absolute top-3 left-3 z-10">
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white text-slate-800 border border-slate-200 shadow-2xs">
                          {product.category?.name || `Cat #${product.category_id}`}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 z-10">
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            product.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Product ID: #{product.id}</span>
                          <span className="font-semibold text-slate-700">Stock: {product.stock} units</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1">{product.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {product.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Salesman / Seller Information Box */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold">
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Salesman / Seller Info:</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {salesmanName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Email: <span className="text-slate-700 font-medium">{salesmanEmail}</span>
                        </p>
                      </div>

                      {/* Price & Admin Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Price</span>
                          <span className="text-lg font-black text-blue-600">
                            {formatPrice(product.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Active/Hidden */}
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(product)}
                            disabled={isToggling}
                            className={`p-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                              product.is_active
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                            className="p-2 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors cursor-pointer"
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