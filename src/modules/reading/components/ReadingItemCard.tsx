"use client";

import {
  Check,
  ExternalLink,
  Pencil,
  RefreshCw,
  Trash2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadingItem } from "../types";
import { PRIORITY_ICONS, PRIORITY_STYLES, formatDate } from "../utils";
import { motion } from "framer-motion";
import { useState } from "react";

interface ReadingItemCardProps {
  item: ReadingItem;
  onToggleRead: (item: ReadingItem) => void;
  onEdit: (item: ReadingItem) => void;
  onDelete: (id: string) => void;
  isToggling: boolean;
  isDeleting: boolean;
}

export function ReadingItemCard({
  item,
  onToggleRead,
  onEdit,
  onDelete,
  isToggling,
  isDeleting,
}: ReadingItemCardProps) {
  const [copied, setCopied] = useState(false);
  const PriorityIcon = PRIORITY_ICONS[item.payload.priority];

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(item.payload.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group relative overflow-hidden",
        item.payload.is_read && "opacity-60",
      )}
    >
      <button
        onClick={() => onToggleRead(item)}
        disabled={isToggling}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all disabled:opacity-50",
          item.payload.is_read
            ? "border-success bg-success/15 text-success"
            : "border-zinc-600 hover:border-zinc-400",
        )}
        aria-label={item.payload.is_read ? "Mark as unread" : "Mark as read"}
      >
        {isToggling ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          item.payload.is_read && <Check className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p
            className={cn(
              "text-sm font-medium truncate max-w-[200px] sm:max-w-md",
              item.payload.is_read
                ? "text-zinc-500 line-through"
                : "text-zinc-50",
            )}
          >
            {item.payload.title}
          </p>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-medium inline-flex items-center gap-1",
              PRIORITY_STYLES[item.payload.priority],
            )}
          >
            <PriorityIcon className="w-3 h-3" /> {item.payload.priority}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 capitalize">
            {item.payload.type}
          </span>
          {item.payload.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded border border-accent/20 bg-accent/5 text-accent/80"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
          {item.payload.source_domain && (
            <span className="font-medium text-zinc-400">
              {item.payload.source_domain}
            </span>
          )}
          <span className="hidden sm:inline">•</span>
          <span>Added {formatDate(item.created_at)}</span>
          {item.payload.read_at && item.payload.is_read && (
            <>
              <span className="hidden sm:inline">•</span>
              <span>Read {formatDate(item.payload.read_at)}</span>
            </>
          )}
        </div>

        {item.payload.notes && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-1 italic">
            &quot;{item.payload.notes}&quot;
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <button
          onClick={handleCopyUrl}
          className="p-1.5 text-zinc-500 hover:text-accent rounded-md hover:bg-zinc-800 transition-colors"
          title={copied ? "Copied!" : "Copy URL"}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
          aria-label={`Edit ${item.payload.title}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <a
          href={item.payload.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
          aria-label={`Open ${item.payload.title}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onDelete(item._id)}
          disabled={isDeleting}
          className="p-1.5 text-zinc-500 hover:text-danger rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
          aria-label={`Delete ${item.payload.title}`}
        >
          {isDeleting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </motion.article>
  );
}
