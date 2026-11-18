import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Loader2,
  Layers,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export const AdminDashboard = () => {
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Category Form State
  const [catName, setCatName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      toastError(err.normalizedMessage || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Helper to preview slug matching backend logic
  const generatePreviewSlug = (text) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const previewSlug = generatePreviewSlug(catName);

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
            Category classification management, system taxonomy, and store oversight
          </p>
        </div>

        <Link
          to="/seller/dashboard"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <span>View Seller Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

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

        {/* Right 2 Columns: Existing Categories List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Existing Product Categories ({categories.length})
            </h2>
            <button
              type="button"
              onClick={fetchCategories}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Refresh List
            </button>
          </div>

          {loading ? (
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
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="min-w-0">
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

                  <span className="text-[10px] text-slate-500 shrink-0">
                    {cat.created_at ? new Date(cat.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
