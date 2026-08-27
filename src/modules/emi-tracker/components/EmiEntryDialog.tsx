"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useDialogAccessibility } from "@/components/ui/Dialog";

interface EmiEntryDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
}

export default function EmiEntryDialog({
  isOpen,
  title,
  description,
  children,
  onClose,
  widthClassName = "max-w-5xl",
}: EmiEntryDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogAccessibility({ isOpen, onClose });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-zinc-800 bg-zinc-950 sm:rounded-lg ${widthClassName}`}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/70 p-5">
              <div>
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
                <h2 id={titleId} className="text-xl font-black text-zinc-50">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm text-zinc-500">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
