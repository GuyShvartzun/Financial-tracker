import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
  removeToast: () => {}
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newToast = { id, message, type };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Notification Container (Floating Bottom-Center / RTL) */}
      <div 
        className="fixed bottom-20 md:bottom-6 right-1/2 translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4"
        dir="rtl"
        aria-live="polite"
      >
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/10'
                  : isError
                  ? 'bg-white dark:bg-slate-800 text-red-900 dark:text-red-300 border-red-300 dark:border-red-700/60 shadow-red-500/10'
                  : 'bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                {isError && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                {isInfo && <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                <span className="truncate">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 rounded-lg transition cursor-pointer shrink-0"
                title="סגור"
                aria-label="סגור התראה"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  return context || { showToast: () => {}, removeToast: () => {} };
}
