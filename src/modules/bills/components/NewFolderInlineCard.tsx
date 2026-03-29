"use client";

import { useState, useRef, useEffect } from "react";
import { FolderPlus, Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface NewFolderInlineCardProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  creating: boolean;
}

export default function NewFolderInlineCard({
  onSubmit,
  onCancel,
  creating,
}: NewFolderInlineCardProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 p-4 flex items-center gap-4 backdrop-blur-sm"
    >
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
        <FolderPlus className="w-6 h-6 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="New folder name…"
          disabled={creating}
          className="w-full bg-transparent border-b border-accent/30 text-sm font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent/60 focus:ring-0 pb-1.5 disabled:opacity-50 transition-colors"
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={creating || !name.trim()}
          className="p-2 text-accent hover:bg-accent/10 disabled:opacity-40 rounded-xl transition-all"
        >
          <Check className="w-5 h-5" />
        </button>
        <button
          onClick={onCancel}
          className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
