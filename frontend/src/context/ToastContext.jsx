import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const error = useCallback((msg, duration) => addToast(msg, 'error', duration), [addToast]);
  const info = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]);
  const warning = useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-white border-emerald-300 text-emerald-950 shadow-xl shadow-emerald-900/5 ring-1 ring-emerald-500/20',
            error: 'bg-white border-red-300 text-red-950 shadow-xl shadow-red-900/5 ring-1 ring-red-500/20',
            warning: 'bg-white border-amber-300 text-amber-950 shadow-xl shadow-amber-900/5 ring-1 ring-amber-500/20',
            info: 'bg-white border-blue-300 text-slate-900 shadow-xl shadow-blue-900/5 ring-1 ring-blue-500/20',
          }[toast.type] || 'bg-white border-slate-200 text-slate-900 shadow-xl';

          const iconStyles = {
            success: 'text-emerald-600',
            error: 'text-red-600',
            warning: 'text-amber-500',
            info: 'text-blue-600',
          }[toast.type] || 'text-slate-600';

          const IconComponent = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[toast.type] || Info;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 animate-in slide-in-from-bottom-3 ${typeStyles}`}
            >
              <IconComponent className={`w-5 h-5 mt-0.5 shrink-0 ${iconStyles}`} />
              <div className="flex-1 text-xs sm:text-sm font-bold leading-snug break-words">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};