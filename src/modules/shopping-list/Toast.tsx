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
}

export default function Toast({ message, type, isVisible, onClose, duration = 4000 }: ToastProps) {
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
        success: "border-success/20 bg-success/10 text-success",
        error: "border-danger/20 bg-danger/10 text-danger",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-400"
    }[type];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-4 py-3 border rounded-2xl shadow-2xl backdrop-blur-md min-w-[300px] max-w-md ${colors}`}
                >
                    <Icon className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-semibold flex-1 leading-tight">{message}</p>
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
