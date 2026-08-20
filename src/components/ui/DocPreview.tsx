"use client";

import { useRef } from "react";
import { X, Download, FileText, ImageIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useDialogAccessibility } from "./Dialog";

interface DocPreviewProps {
  src: string;
  contentType: string;
  filename: string;
  size?: number;
  onClose: () => void;
}

export default function DocPreview({
  src,
  contentType,
  filename,
  size,
  onClose,
}: DocPreviewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogAccessibility({
    isOpen: true,
    onClose,
    initialFocusRef: closeRef,
  });

  if (typeof document === "undefined") return null;

  const isPDF = contentType === "application/pdf";
  const isImage = contentType.startsWith("image/");

  const formatBytes = (bytes: number = 0) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-preview-title"
      tabIndex={-1}
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between z-10 bg-gradient-to-b from-zinc-950/80 to-transparent">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-lg">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-accent" />
            ) : isPDF ? (
              <FileText className="w-5 h-5 text-danger" />
            ) : (
              <FileText className="w-5 h-5 text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3
              id="doc-preview-title"
              className="text-zinc-100 text-sm font-bold truncate"
            >
              {filename}
            </h3>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-0.5">
              {size ? formatBytes(size) : contentType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={src}
            download={filename}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all active:scale-95 shadow-lg group"
            aria-label="Download document"
            title="Download"
          >
            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </a>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-all active:scale-95 shadow-lg group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close document preview"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div
        className="relative w-full h-full flex items-center justify-center pt-20 pb-12"
        onClick={onClose}
      >
        <div
          className={cn(
            "relative w-full h-full max-w-5xl max-h-[85vh] animate-in zoom-in-95 duration-300",
            isPDF ? "bg-zinc-50 rounded-xl shadow-2xl overflow-hidden" : "",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {isImage ? (
            <div className="relative w-full h-full">
              <Image
                src={src}
                alt={filename}
                fill
                unoptimized
                className="object-contain rounded-lg drop-shadow-2xl"
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={`${src}#toolbar=0&view=Fit`}
              title={filename}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <FileText className="w-16 h-16 opacity-20" />
              <p className="text-sm font-medium">
                Preview not available for this file type
              </p>
              <a
                href={src}
                download={filename}
                className="px-6 py-2 bg-accent text-zinc-50 rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Download to View
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-6 text-zinc-500 text-xs font-medium uppercase tracking-widest text-center w-full pointer-events-none opacity-50">
        Click outside to close
      </div>
    </div>,
    document.body,
  );
}
