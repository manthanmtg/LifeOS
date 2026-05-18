import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 4000,
  action,
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[type];

  const colors = {
    success: "border-success/20 bg-success/10 text-success",
    error: "border-danger/20 bg-danger/10 text-danger",
    info: "border-accent/20 bg-accent/10 text-accent",
  }[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          role={type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`fixed left-4 right-4 bottom-4 sm:left-auto sm:right-8 sm:bottom-8 z-[10000] flex items-center gap-3 px-4 py-3 border rounded-2xl shadow-2xl backdrop-blur-md min-w-0 sm:min-w-[300px] max-w-[calc(100%-2rem)] sm:max-w-md ${colors}`}
        >
          <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-semibold flex-1 leading-tight">
            {message}
          </p>

          {action && (
            <button
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className="px-3 py-2.5 sm:py-1.5 min-h-[44px] min-w-[44px] bg-zinc-50/10 hover:bg-zinc-50/20 rounded-xl text-xs font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 shrink-0"
            >
              {action.label}
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Close notification"
            className="min-h-[44px] min-w-[44px] p-2.5 sm:p-1 hover:bg-zinc-50/5 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 shrink-0 flex items-center justify-center"
          >
            <X className="w-4 h-4 opacity-50 hover:opacity-100" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
