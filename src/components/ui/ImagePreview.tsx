"use client";

import React from "react";
import { X, Download } from "lucide-react";
import { createPortal } from "react-dom";

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImagePreview({ src, alt, onClose }: ImagePreviewProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Header / Controls */}
      <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between z-10">
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
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
            title="Download Image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Footer Info / Tip */}
      <div className="absolute bottom-6 text-zinc-500 text-[10px] sm:text-xs font-medium uppercase tracking-widest text-center w-full">
        Click anywhere to close
      </div>
    </div>,
    document.body,
  );
}
