"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Code,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import type { CropExportFormat } from "../lib/export-data";

const choices: Array<{
  format: CropExportFormat;
  label: string;
  Icon: typeof FileText;
}> = [
  { format: "xlsx", label: "Download as Excel", Icon: FileSpreadsheet },
  { format: "pdf", label: "Download as PDF", Icon: FileText },
  { format: "html", label: "Download as HTML", Icon: Code },
];

export function CropDownloadMenu({
  disabled,
  disabledReason,
  onChoose,
}: {
  disabled: boolean;
  disabledReason?: string | null;
  onChoose: (format: CropExportFormat) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: Math.min(window.innerHeight - 150, rect.bottom + 8),
        left: Math.max(8, Math.min(window.innerWidth - 224, rect.right - 224)),
      });
    };
    const close = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  const choose = (format: CropExportFormat) => {
    setOpen(false);
    triggerRef.current?.focus();
    onChoose(format);
  };
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={disabledReason || undefined}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="text-xs md:text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 md:px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-700 disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download{" "}
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Download crop history"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
            }}
            className="z-[110] w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-2xl"
          >
            {choices.map(({ format, label, Icon }) => (
              <button
                key={format}
                type="button"
                role="menuitem"
                onClick={() => choose(format)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
