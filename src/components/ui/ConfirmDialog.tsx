import { AlertTriangle } from "lucide-react";
import { useId, useRef } from "react";
import Dialog from "./Dialog";

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
  variant = "danger",
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      initialFocusRef={cancelRef}
      className="max-w-sm p-6"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            variant === "danger"
              ? "bg-danger/10 text-danger"
              : "bg-warning/10 text-warning"
          }`}
          aria-hidden="true"
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h3 id={titleId} className="text-lg font-bold text-zinc-50">
            {title}
          </h3>
          <p
            id={descriptionId}
            className="text-sm text-zinc-500 leading-relaxed px-2"
          >
            {description}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 w-full pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
              variant === "danger"
                ? "bg-danger text-zinc-50 hover:bg-danger-muted shadow-danger/20 focus-visible:ring-danger"
                : "bg-warning text-zinc-900 hover:bg-warning-muted shadow-warning/20 focus-visible:ring-warning"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
