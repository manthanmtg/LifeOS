"use client";

import { motion } from "framer-motion";
import { Star, Copy, Check, Edit3, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet } from "./types";
import { formatDate, withLineNumbers } from "./types";

interface SnippetCardProps {
  snippet: Snippet;
  index: number;
  copiedId: string | null;
  processingAction: { id: string; action: "delete" | "favorite" } | null;
  showLineNumbers: boolean;
  onCopy: (id: string, code: string) => void;
  onToggleFavorite: (snippet: Snippet) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" as const },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.2 },
  },
};

export default function SnippetCard({
  snippet,
  index,
  copiedId,
  processingAction,
  showLineNumbers,
  onCopy,
  onToggleFavorite,
  onEdit,
  onDelete,
}: SnippetCardProps) {
  const isFavoriting =
    processingAction?.id === snippet._id &&
    processingAction.action === "favorite";
  const isDeleting =
    processingAction?.id === snippet._id &&
    processingAction.action === "delete";
  const isCopied = copiedId === snippet._id;
  const lineCount = snippet.payload.code.split("\n").length;

  return (
    <motion.article
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          {snippet.payload.is_favorite && (
            <Star
              className="w-3.5 h-3.5 text-warning shrink-0"
              fill="currentColor"
            />
          )}
          <p className="text-sm font-medium text-zinc-50 truncate">
            {snippet.payload.title}
          </p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
            {snippet.payload.language}
          </span>
          <span className="text-[10px] text-zinc-600 shrink-0">
            {lineCount}L
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 transition-opacity shrink-0 max-sm:opacity-60 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            onClick={() => onCopy(snippet._id, snippet.payload.code)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              isCopied
                ? "text-success bg-success/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
            )}
            aria-label="Copy code"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onToggleFavorite(snippet)}
            disabled={isFavoriting || isDeleting}
            className="p-1.5 text-zinc-500 hover:text-warning rounded-md hover:bg-zinc-800 disabled:opacity-50"
            aria-label={
              snippet.payload.is_favorite
                ? "Remove from favorites"
                : "Add to favorites"
            }
            aria-pressed={snippet.payload.is_favorite}
          >
            {isFavoriting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Star
                className="w-3.5 h-3.5"
                fill={snippet.payload.is_favorite ? "currentColor" : "none"}
              />
            )}
          </button>
          <button
            onClick={() => onEdit(snippet)}
            disabled={isFavoriting || isDeleting}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Edit snippet"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(snippet._id)}
            disabled={isFavoriting || isDeleting}
            className="p-1.5 text-zinc-500 hover:text-danger rounded-md hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Delete snippet"
          >
            {isDeleting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code block */}
      <pre className="px-4 py-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-[220px] overflow-y-auto">
        <code>
          {showLineNumbers
            ? withLineNumbers(snippet.payload.code)
            : snippet.payload.code}
        </code>
      </pre>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800">
        {snippet.payload.description && (
          <p className="text-xs text-zinc-500 line-clamp-1 mb-1">
            {snippet.payload.description}
          </p>
        )}
        {snippet.payload.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {snippet.payload.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-zinc-600">
          Added {formatDate(snippet.created_at)}
        </p>
      </div>
    </motion.article>
  );
}
