import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
    variant?: "danger" | "warning";
}

export default function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onClose,
    variant = "danger"
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${variant === "danger" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                                }`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-zinc-50">{title}</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed px-2">
                                    {description}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full pt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg ${variant === "danger"
                                        ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20"
                                        : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                                        }`}
                                >
                                    {confirmLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
