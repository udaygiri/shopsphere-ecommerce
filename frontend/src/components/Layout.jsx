import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ShoppingBag, ShieldCheck, Zap } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sticky Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 mt-12 py-8 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-200">ShopSphere</span>
              <span className="text-xs text-slate-500">| Full-Stack Role-Based Platform</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> RBAC Verified
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400" /> React 19 + FastAPI
              </span>
            </div>

            <p className="text-xs text-slate-500">
              © {CURRENT_YEAR} ShopSphere. Built for Internship Assessment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
