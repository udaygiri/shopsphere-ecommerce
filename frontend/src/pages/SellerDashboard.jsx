import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  Layers,
  ShoppingBag,
  UploadCloud,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import api from '../api/client';
import { uploadImageToCloudinary } from '../api/cloudinary';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const SellerDashboard = () => {
  const { success, error: toastError, info } = useToast();
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'

  // Products State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Modal State for Add / Edit Product
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Image Toggle & Upload State
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    image_url: '',
    is_active: true,
  });

  // Fetch Categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        console.warn('Failed to load categories:', err.message);
      }
    };
    fetchCats();
  }, []);

  // Fetch Seller's Products
  const fetchMyProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/products/seller/me');
      setProducts(res.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to load seller products');
    } finally {
      setLoadingProducts(false);
    }
  }, [toastError]);

  // Fetch Seller's Orders
  const fetchMyOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get('/orders/seller/me');
      setOrders(res.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to load seller orders');
    } finally {
      setLoadingOrders(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchMyProducts();
    } else {
      fetchMyOrders();
    }
  }, [activeTab, fetchMyProducts, fetchMyOrders]);

  // Handle open Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setImageInputMode('upload');
    setUploadProgress(0);
    setProductForm({
      title: '',
      description: '',
      price: '',
      stock: '10',
      category_id: categories.length > 0 ? categories[0].id : '',
      image_url: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setImageInputMode(product.image_url ? 'url' : 'upload');
    setUploadProgress(0);
    setProductForm({
      title: product.title,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category_id,
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    setModalOpen(true);
  };

  // Handle Device File Upload to Cloudinary
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toastError('File size exceeds the 10MB limit.');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);

    try {
      const secureUrl = await uploadImageToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });
      setProductForm((prev) => ({ ...prev, image_url: secureUrl }));
      success('Image uploaded to Cloudinary successfully!');
    } catch (err) {
      toastError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Form Submission for Create or Edit
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    try {
      const payload = {
        title: productForm.title.trim(),
        description: productForm.description.trim() || null,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock, 10),
        category_id: parseInt(productForm.category_id, 10),
        image_url: productForm.image_url.trim() || null,
        is_active: productForm.is_active,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        success(`Product "${payload.title}" updated successfully!`);
      } else {
        await api.post('/products', payload);
        success(`Product "${payload.title}" created successfully!`);
      }

      setModalOpen(false);
      fetchMyProducts();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    try {
      await api.delete(`/products/${id}`);
      success(`Product "${title}" deleted successfully`);
      fetchMyProducts();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to delete product');
    }
  };

  // Handle Order Status Update
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      success(`Order #${orderId} marked as ${newStatus}`);
      if (newStatus === 'CANCELLED') {
        info('Deducted inventory items have been automatically replenished to stock.');
      }
      fetchMyOrders();
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Seller Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your store catalog, real-time inventory, and customer fulfillments
          </p>
        </div>

        {activeTab === 'products' && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Package className="w-4 h-4 text-indigo-400" />
          <span>Product Inventory ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span>Customer Orders ({orders.length})</span>
        </button>
      </div>

      {/* TAB 1: Product Inventory */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {loadingProducts ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-400">Loading your catalog items...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="min-h-[40vh] rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center">
              <Layers className="w-14 h-14 text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-200">No Products Listed Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
                Start adding products to your catalog to make them available for customers to discover and purchase.
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
              >
                Create First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl"
                  >
                    {/* Thumbnail */}
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
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-rose-950/90 text-rose-300 border border-rose-800/80 backdrop-blur-md">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-amber-950/90 text-amber-300 border border-amber-800/80 backdrop-blur-md">
                            Low: {product.stock} Left
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 backdrop-blur-md">
                            Stock: {product.stock}
                          </span>
                        )}
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

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                            {product.category?.name || `Category #${product.category_id}`}
                          </span>
                          <span className="text-xs text-slate-500">ID: #{product.id}</span>
                        </div>
                        <h3 className="font-bold text-white text-base mt-1 line-clamp-1">{product.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {product.description || 'No description.'}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-lg font-bold text-white">
                          {formatPrice(product.price)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(product)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB 2: Order Management */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-400">Loading seller orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="min-h-[40vh] rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center">
              <Package className="w-14 h-14 text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-200">No Orders Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1">
                When customers purchase items from your catalog, their orders will appear here for processing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isUpdating = updatingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-white text-base">Order #{order.id}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                            Status: {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Placed on: {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Status Transition Controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">Change Status:</span>
                        <select
                          disabled={isUpdating || order.status === 'CANCELLED' || order.status === 'DELIVERED'}
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 disabled:opacity-40 cursor-pointer"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED (Replenish)</option>
                        </select>
                        {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400">
                      <strong className="text-slate-300">Shipping Destination: </strong>
                      {order.shipping_address}
                    </div>

                    {/* Items belonging to this seller */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Items Purchased from Your Store
                      </h4>
                      <div className="divide-y divide-slate-800/60 rounded-xl bg-slate-950/40 border border-slate-800/60">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-white">{item.product_title}</p>
                              <p className="text-slate-400">
                                {item.quantity} units × {formatPrice(item.unit_price)}
                              </p>
                            </div>
                            <span className="font-bold text-white">{formatPrice(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingProduct ? 'Edit Product Details' : 'Add New Catalog Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category *
                </label>
                <select
                  required
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Select a Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="499.00"
                    className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="10"
                    className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Product Image Section with Toggle: Upload vs URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Product Image
                  </label>
                  
                  {/* Mode Toggle */}
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        imageInputMode === 'upload'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        imageInputMode === 'url'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>URL</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: File Upload from Device */}
                {imageInputMode === 'upload' && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {uploadingImage ? (
                      <div className="p-6 rounded-2xl border border-dashed border-indigo-500/50 bg-indigo-950/20 flex flex-col items-center justify-center text-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <p className="text-xs font-semibold text-slate-200">
                          Uploading image to Cloudinary... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                        </p>
                        <p className="text-[10px] text-slate-400">Please wait while the image is uploaded</p>
                      </div>
                    ) : productForm.image_url ? (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                            <img
                              src={productForm.image_url}
                              alt="Uploaded preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Image Attached
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                              {productForm.image_url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductForm({ ...productForm, image_url: '' })}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-950/60 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-200">
                          Click to choose image from device
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Direct Cloudinary upload (PNG, JPG, JPEG, WEBP up to 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Direct Image URL */}
                {imageInputMode === 'url' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="url"
                        value={productForm.image_url}
                        onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg or paste image URL"
                        className="w-full bg-slate-950 text-sm text-white pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                      {productForm.image_url && (
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, image_url: '' })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {productForm.image_url && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                          <img
                            src={productForm.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-semibold text-slate-300">URL Preview</span>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{productForm.image_url}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Key features, specifications, and warranty details..."
                  className="w-full bg-slate-950 text-sm text-white px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={productForm.is_active}
                  onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <label htmlFor="is_active_toggle" className="text-xs text-slate-300 cursor-pointer">
                  Visible in storefront catalog (Active)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || uploadingImage}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
