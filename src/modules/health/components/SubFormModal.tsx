"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useId, useRef } from "react";
import Dialog from "@/components/ui/Dialog";

interface SubFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSave: () => void;
  saving?: boolean;
  children: React.ReactNode;
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export default function SubFormModal({
  open,
  onClose,
  title,
  onSave,
  saving,
  children,
}: SubFormModalProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Portal>
      <Dialog
        isOpen={open}
        onClose={onClose}
        aria-labelledby={titleId}
        initialFocusRef={cancelRef}
        className="mx-2 flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col rounded-2xl sm:mx-0 sm:max-h-[80dvh] sm:rounded-3xl"
      >
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <h3
            id={titleId}
            className="text-base sm:text-lg font-bold text-zinc-50"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="min-h-11 min-w-11 p-2 rounded-lg hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
        <div className="p-4 sm:p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Dialog>
    </Portal>
  );
}
