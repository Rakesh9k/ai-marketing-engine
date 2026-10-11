'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type']) => void;
  dismissToast: (id: string) => void;
}

// Meaning is never colour-only: each type has its own glyph and a screen-reader label.
const TOAST_ICON: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};
const TOAST_LABEL: Record<Toast['type'], string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Notice',
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).substring(7);
    // Identical message + type already on screen (e.g. the same request failing in a loop):
    // keep the existing toast instead of stacking a duplicate.
    setToasts((prev) =>
      prev.some((t) => t.message === message && t.type === type)
        ? prev
        : [...prev, { id, message, type }]
    );

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`animate-slide-in flex max-w-md min-w-[280px] items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
              toast.type === 'success'
                ? 'bg-success-600 text-on-brand'
                : toast.type === 'error'
                  ? 'bg-error-600 text-on-brand'
                  : toast.type === 'warning'
                    ? 'bg-warning-600 text-on-brand'
                    : 'bg-brand-600 text-on-brand'
            }`}
          >
            <span aria-hidden="true" className="text-sm font-bold">
              {TOAST_ICON[toast.type]}
            </span>
            <span className="flex-1 text-sm">
              <span className="sr-only">{TOAST_LABEL[toast.type]}: </span>
              {toast.message}
            </span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-on-brand/80 hover:text-on-brand focus-visible:outline-on-brand rounded focus-visible:outline-2 focus-visible:outline-offset-2"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
