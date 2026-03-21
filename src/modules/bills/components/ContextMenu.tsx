"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/40 py-1.5 overflow-hidden"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          disabled={item.disabled}
          className={cn(
            "w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-40",
            item.danger
              ? "text-danger hover:bg-danger/10"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}
