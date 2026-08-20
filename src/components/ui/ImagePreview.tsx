"use client";

import React from "react";
import { X, Download } from "lucide-react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useDialogAccessibility } from "./Dialog";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImagePreview({ src, alt, onClose }: ImagePreviewProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogAccessibility({
    isOpen: true,
    onClose,
    initialFocusRef: closeRef,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
      tabIndex={-1}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        onClick={onClose}
        aria-label="Close image preview backdrop"
      />

      {/* Header / Controls */}
      <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between z-20">
        <div className="min-w-0 flex-1">
          {alt && (
            <p className="text-zinc-400 text-sm font-medium truncate pr-4">
              {alt}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={src}
            download={alt || "profile-picture"}
            className="min-h-11 min-w-11 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Download image"
            title="Download Image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close image preview"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4 sm:p-8 pointer-events-none">
        <div className="relative w-full h-full max-w-full max-h-[85vh]">
          <Image
            src={src}
            alt={alt || "Image Preview"}
            fill
            unoptimized
            className="object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300 pointer-events-auto"
          />
        </div>
      </div>

      {/* Footer Info / Tip */}
      <div className="absolute bottom-6 z-10 text-zinc-500 text-xs sm:text-xs font-medium uppercase tracking-widest text-center w-full pointer-events-none">
        Click backdrop to close
      </div>
    </div>,
    document.body,
  );
}
