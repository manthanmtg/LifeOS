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

export default function Toast({ message, type, isVisible, onClose, duration = 4000, action }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const Icon = {
        success: CheckCircle2,
        error: AlertCircle,
        info: Info
    }[type];

    const colors = {
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        error: "border-red-500/20 bg-red-500/10 text-red-400",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-400"
    }[type];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`fixed bottom-8 right-8 z-[10000] flex items-center gap-3 px-4 py-3 border rounded-2xl shadow-2xl backdrop-blur-md min-w-[300px] max-w-md ${colors}`}
                >
                    <Icon className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-semibold flex-1 leading-tight">{message}</p>

                    {action && (
                        <button
                            onClick={() => {
                                action.onClick();
                                onClose();
                            }}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all shrink-0"
                        >
                            {action.label}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                    >
                        <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
