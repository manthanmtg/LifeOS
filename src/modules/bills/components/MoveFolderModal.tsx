"use client";

import { useId, useRef, useState } from "react";
import { X, Folder, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Dialog from "@/components/ui/Dialog";
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
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

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
    <Dialog
      isOpen
      onClose={onClose}
      aria-labelledby={titleId}
      initialFocusRef={cancelRef}
      containerClassName="z-[60]"
      className="max-w-sm rounded-2xl border-zinc-700 bg-zinc-900"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <h2 id={titleId} className="text-sm font-bold text-zinc-100">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close move folder modal"
          className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
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
          ref={cancelRef}
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onMove(selected)}
          className="flex-1 px-3 py-2 rounded-xl bg-accent text-zinc-950 text-sm font-bold hover:bg-accent-hover transition-colors"
        >
          Move Here
        </button>
      </div>
    </Dialog>
  );
}
