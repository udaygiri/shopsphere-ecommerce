import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, Loader2, Store, ShoppingCart, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Register = () => {
  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'CUSTOMER',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });

      success(`Account created successfully! Welcome, ${user.full_name || 'User'}!`);
      if (user.role?.toUpperCase() === 'SELLER') {
        navigate('/seller/dashboard');
      } else if (user.role?.toUpperCase() === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err.normalizedMessage || 'Registration failed. Please check your details.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-8 sm:p-10 shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-4">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Create an Account</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Select your account role and enter your details</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Role Selection Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect('CUSTOMER')}
                className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  formData.role === 'CUSTOMER'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <ShoppingCart className="w-5 h-5 mb-1.5 text-blue-600" />
                <span className="text-xs sm:text-sm font-bold">Customer</span>
                <span className="text-[10px] text-slate-400">Shop & Buy</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('SELLER')}
                className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  formData.role === 'SELLER'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Store className="w-5 h-5 mb-1.5 text-emerald-600" />
                <span className="text-xs sm:text-sm font-bold">Seller</span>
                <span className="text-[10px] text-slate-400">Sell Products</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  formData.role === 'ADMIN'
                    ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mb-1.5 text-amber-600" />
                <span className="text-xs sm:text-sm font-bold">Admin</span>
                <span className="text-[10px] text-slate-400">Oversight</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Jane Doe"
                className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 pl-11 pr-4 py-3 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 pl-11 pr-4 py-3 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 pl-11 pr-4 py-3 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;