"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  addToast: (
    message: string,
    type?: ToastType,
    action?: { label: string; onClick: () => void },
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICON_MAP = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLOR_MAP = {
  success: "border-success/20 bg-success/10 text-success",
  error: "border-danger/20 bg-danger/10 text-danger",
  info: "border-accent/20 bg-accent/10 text-accent",
};

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

let toastCounter = 0;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      action?: { label: string; onClick: () => void },
    ) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [
        ...prev.slice(-(MAX_TOASTS - 1)),
        { id, message, type, action },
      ]);
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[10000] flex flex-col-reverse gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast, i) => {
            const Icon = ICON_MAP[toast.type];
            const colors = COLOR_MAP[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 80 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                style={{ zIndex: 10000 - i }}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 border rounded-2xl shadow-2xl backdrop-blur-md min-w-[300px] max-w-md ${colors}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <p className="text-sm font-semibold flex-1 leading-tight">
                  {toast.message}
                </p>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action!.onClick();
                      removeToast(toast.id);
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all shrink-0"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
