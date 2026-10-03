"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Check, Info, ShoppingBag, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "cart";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const ICON_MAP: Record<ToastType, React.ElementType> = {
  success: Check,
  error: X,
  info: Info,
  cart: ShoppingBag,
};

const ACCENT_MAP: Record<ToastType, string> = {
  success: "bg-accent-green-light text-success-ink",
  error: "bg-danger/10 text-danger",
  info: "bg-secondary-light text-secondary",
  cart: "bg-secondary-light text-secondary",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        style={{ bottom: "calc(5rem + max(1rem, env(safe-area-inset-bottom)))" }}
      >
        {toasts.map((toast) => {
          const Icon = ICON_MAP[toast.type];
          const accent = ACCENT_MAP[toast.type];
          return (
            <div
              key={toast.id}
              className={`border-border/50 bg-card pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all duration-300 ${
                toast.exiting
                  ? "translate-x-full opacity-0"
                  : "translate-x-0 animate-[slideInRight_0.3s_ease-out] opacity-100"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-foreground text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-muted hover:bg-foreground/[0.04] hover:text-foreground ml-1 shrink-0 rounded-full p-2 transition focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
