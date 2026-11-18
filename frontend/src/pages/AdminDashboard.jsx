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
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/currency';

export const AdminDashboard = () => {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'products'

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

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    } else {
      fetchProducts();
    }
  }, [activeTab]);

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
            Category taxonomy management and platform-wide seller products oversight
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-400" />
          <span>All Salesmen Products ({products.length})</span>
        </button>
      </div>

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
