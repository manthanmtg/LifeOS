"use client";

import { type RefObject, type ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const dialogStack: symbol[] = [];
let scrollLockCount = 0;
let originalBodyOverflow = "";

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" && element.tabIndex !== -1,
  );
}

export interface UseDialogAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Returns the current element to receive focus when this dialog closes. */
  getRestoreFocusTarget?: () => HTMLElement | null;
}

/**
 * Shared modal behavior for custom overlays that cannot use the Dialog shell.
 * It traps focus, closes the top-most dialog with Escape, restores the opener,
 * and safely coordinates body scroll locking across nested dialogs.
 */
export function useDialogAccessibility({
  isOpen,
  onClose,
  initialFocusRef,
  getRestoreFocusTarget,
}: UseDialogAccessibilityOptions) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(Symbol("dialog"));
  const onCloseRef = useRef(onClose);
  const getRestoreFocusTargetRef = useRef(getRestoreFocusTarget);
  onCloseRef.current = onClose;
  getRestoreFocusTargetRef.current = getRestoreFocusTarget;

  useEffect(() => {
    if (!isOpen) return;

    const id = instanceId.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogStack.push(id);

    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLockCount += 1;

    const dialog = dialogRef.current;
    const initialTarget =
      initialFocusRef?.current ??
      (dialog ? getFocusableElements(dialog)[0] : undefined) ??
      dialog;
    initialTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== id) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      const currentDialog = dialogRef.current;
      if (event.key !== "Tab" || !currentDialog) return;

      const focusable = getFocusableElements(currentDialog);
      if (focusable.length === 0) {
        event.preventDefault();
        currentDialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const stackIndex = dialogStack.lastIndexOf(id);
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1);

      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
      }

      const restoreTarget = getRestoreFocusTargetRef.current?.() ?? opener;
      if (restoreTarget?.isConnected) restoreTarget.focus();
    };
  }, [initialFocusRef, isOpen]);

  return dialogRef;
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
  containerClassName?: string;
  backdropClassName?: string;
  className?: string;
}

export default function Dialog({
  isOpen,
  onClose,
  children,
  role = "dialog",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  initialFocusRef,
  closeOnBackdrop = true,
  containerClassName,
  backdropClassName,
  className,
}: DialogProps) {
  const dialogRef = useDialogAccessibility({
    isOpen,
    onClose,
    initialFocusRef,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-4 [padding-top:max(1rem,env(safe-area-inset-top))] [padding-right:max(1rem,env(safe-area-inset-right))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))]",
            containerClassName,
          )}
          role="presentation"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 cursor-default bg-zinc-950/60 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
              backdropClassName,
            )}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-label={closeOnBackdrop ? "Close dialog" : "Dialog backdrop"}
            tabIndex={-1}
            data-testid="dialog-backdrop"
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role={role}
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl focus:outline-none",
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
