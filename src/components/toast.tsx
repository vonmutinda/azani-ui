"use client";

import { createContext, useCallback, useContext } from "react";
import { Check, Info, ShoppingBag, X } from "lucide-react";
import { Toast, toast as heroToast } from "@heroui/react";

type ToastType = "success" | "error" | "info" | "cart";

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<ToastType, React.ElementType> = {
  success: Check,
  error: X,
  info: Info,
  cart: ShoppingBag,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const Icon = ICON_MAP[type];
    const show =
      type === "success" ? heroToast.success : type === "error" ? heroToast.danger : heroToast.info;

    show(message, {
      indicator: <Icon aria-hidden="true" className="size-4" />,
      timeout: 3000,
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast.Provider
        className="azani-toast-region z-[100]"
        maxVisibleToasts={4}
        placement="bottom end"
        width="min(28rem, calc(100vw - 2rem))"
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
