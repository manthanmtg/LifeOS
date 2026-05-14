"use client";

import { useState } from "react";
import { X, Folder, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { BillFolder } from "../types";

interface MoveFolderModalProps {
  folders: BillFolder[];
  currentFolderId?: string;
  title: string;
  excludeFolderIds?: string[];
  onMove: (targetFolderId: string | null) => void;
  onClose: () => void;
}

export default function MoveFolderModal({
  folders,
  currentFolderId,
  title,
  excludeFolderIds = [],
  onMove,
  onClose,
}: MoveFolderModalProps) {
  const [selected, setSelected] = useState<string | null>(
    currentFolderId ?? null,
  );

  const renderNode = (parentId: string | undefined, depth: number) => {
    const children = folders.filter(
      (f) =>
        (f.payload.parent_id ?? undefined) === parentId &&
        !excludeFolderIds.includes(f._id),
    );
    if (children.length === 0) return null;
    return children.map((f) => (
      <div key={f._id}>
        <button
          onClick={() => setSelected(f._id)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            selected === f._id
              ? "bg-accent/15 text-accent border border-accent/30"
              : "text-zinc-300 hover:bg-zinc-800 border border-transparent",
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <Folder className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{f.payload.name}</span>
        </button>
        {renderNode(f._id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-1">
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              selected === null
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-zinc-300 hover:bg-zinc-800 border border-transparent",
            )}
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>Root (no folder)</span>
          </button>
          {renderNode(undefined, 0)}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onMove(selected)}
            className="flex-1 px-3 py-2 rounded-xl bg-accent text-zinc-950 text-sm font-bold hover:bg-accent-hover transition-colors"
          >
            Move Here
          </button>
        </div>
      </motion.div>
    </div>
  );
}
