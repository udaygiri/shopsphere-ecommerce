import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Mail, ShoppingBag, ShieldCheck, Zap, Truck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CURRENT_YEAR = new Date().getFullYear();

export const Layout = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { success } = useToast();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      success('Thank you for subscribing to ShopSphere updates!');
      setNewsletterEmail('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faff] text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Sticky Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Stay Updated / Newsletter Banner (Exact match to reference image bottom) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-10">
        <div className="rounded-3xl bg-gradient-to-r from-blue-100/70 via-indigo-50/80 to-blue-100/70 border border-blue-200/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Stay Updated</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Get the latest deals and updates straight to your inbox.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubscribe} className="flex-1 max-w-md w-full flex items-center relative">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full bg-white text-xs text-slate-900 placeholder-slate-400 pl-4 pr-32 py-3 rounded-full border border-slate-200 shadow-2xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Subscribe
            </button>
          </form>

          {/* Social Icons (Reference Image: FB, Insta, YT, Twitter in soft blue circles) */}
          <div className="flex items-center gap-2">
            <span aria-label="Facebook" className="w-9 h-9 rounded-full bg-white text-blue-600 border border-slate-200 flex items-center justify-center hover:bg-blue-50 cursor-pointer transition-colors shadow-2xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z"/></svg>
            </span>
            <span aria-label="Instagram" className="w-9 h-9 rounded-full bg-white text-blue-600 border border-slate-200 flex items-center justify-center hover:bg-blue-50 cursor-pointer transition-colors shadow-2xs">
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </span>
            <span aria-label="YouTube" className="w-9 h-9 rounded-full bg-white text-blue-600 border border-slate-200 flex items-center justify-center hover:bg-blue-50 cursor-pointer transition-colors shadow-2xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </span>
            <span aria-label="Twitter" className="w-9 h-9 rounded-full bg-white text-blue-600 border border-slate-200 flex items-center justify-center hover:bg-blue-50 cursor-pointer transition-colors shadow-2xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </span>
          </div>
        </div>
      </div>

      {/* Global E-Commerce Footer */}
      <footer className="border-t border-slate-100 bg-white text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="font-black text-lg tracking-tight text-slate-900">
                  Shop<span className="text-blue-600">Sphere</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Shop smarter, live better. Explore millions of handpicked products from verified sellers with fast, secure checkout.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">Explore Catalog</h5>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><span className="hover:text-blue-600 transition-colors">Electronics & Gadgets</span></li>
                <li><span className="hover:text-blue-600 transition-colors">Wearables & Smart Watches</span></li>
                <li><span className="hover:text-blue-600 transition-colors">Audio & Music Devices</span></li>
                <li><span className="hover:text-blue-600 transition-colors">Fashion & Lifestyle</span></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">Account & Portal</h5>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><span className="hover:text-blue-600 transition-colors">Customer Wishlist</span></li>
                <li><span className="hover:text-blue-600 transition-colors">My Order History</span></li>
                <li><span className="hover:text-blue-600 transition-colors">Seller Dashboard & Catalog</span></li>
                <li><span className="hover:text-blue-600 transition-colors">Admin Governance</span></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3">Guarantees</h5>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Authentic Sellers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Atomic Live Dispatch</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Razorpay HMAC-SHA256 Payment</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="border-t border-slate-100 py-4 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <p>© {CURRENT_YEAR} ShopSphere. All rights reserved.</p>
            <p>Designed with clean e-commerce precision.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;