import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve intended destination so login can redirect back
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user?.role ? String(user.role).toUpperCase() : null;
  const isAuthorized = allowedRoles
    ? allowedRoles.map((r) => r.toUpperCase()).includes(userRole)
    : true;

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] max-w-md mx-auto px-4 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 mb-6">
          Your account role (<span className="font-semibold text-slate-200 uppercase">{user?.role}</span>) does not have permission to view this page.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
