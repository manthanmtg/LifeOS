"use client";

import { motion } from "framer-motion";
import { Tv, Star, Edit3, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BingeItem } from "../types";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
  TYPE_STYLES,
} from "../types";

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.35, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

interface BingeCardProps {
  item: BingeItem;
  onEdit: (item: BingeItem) => void;
  onDelete: (id: string) => void;
  isDeletingId: string | null;
  index: number;
}

function SeasonProgress({ item }: { item: BingeItem }) {
  const { current_season, current_episode, total_seasons } = item.payload;
  if (!current_season) return null;

  const progress =
    total_seasons && total_seasons > 0
      ? Math.min((current_season / total_seasons) * 100, 100)
      : 0;

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-zinc-500">
        S{current_season}
        {current_episode ? ` · E${current_episode}` : ""}
        {total_seasons ? ` / ${total_seasons} seasons` : ""}
      </p>
      {progress > 0 && (
        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent/60"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function BingeCard({
  item,
  onEdit,
  onDelete,
  isDeletingId,
  index,
}: BingeCardProps) {
  const isDeleting = isDeletingId === item._id;
  const isSeries =
    item.payload.type === "series" || item.payload.type === "anime";

  return (
    <motion.article
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group relative overflow-hidden"
    >
      {/* Subtle gradient accent at top */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px]",
          item.payload.status === "watching" &&
            "bg-gradient-to-r from-warning/60 to-warning/0",
          item.payload.status === "completed" &&
            "bg-gradient-to-r from-success/60 to-success/0",
          item.payload.status === "to_watch" &&
            "bg-gradient-to-r from-accent/60 to-accent/0",
          item.payload.status === "dropped" &&
            "bg-gradient-to-r from-zinc-500/60 to-zinc-500/0",
        )}
      />

      <div className="flex items-start gap-3">
        {/* Poster */}
        <div className="w-14 h-20 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
          {item.payload.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.payload.poster_url}
              alt={item.payload.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Tv className="w-5 h-5 text-zinc-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-50 line-clamp-2 leading-snug">
            {item.payload.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {item.payload.year && (
              <span className="text-[10px] text-zinc-500">
                {item.payload.year}
              </span>
            )}
            {item.payload.platform && (
              <span className="text-[10px] text-zinc-500">
                · {item.payload.platform}
              </span>
            )}
            <span className="text-[10px] text-zinc-600 ml-auto">
              {formatRelativeDate(item.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border",
                TYPE_STYLES[item.payload.type],
              )}
            >
              {TYPE_LABELS[item.payload.type]}
            </span>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border",
                STATUS_STYLES[item.payload.status],
              )}
            >
              {STATUS_LABELS[item.payload.status]}
            </span>
            {item.payload.rating ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-warning/25 bg-warning/10 text-warning flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" fill="currentColor" />{" "}
                {item.payload.rating}/10
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(item)}
            disabled={isDeleting}
            aria-label="Edit item"
            title="Edit"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item._id)}
            disabled={isDeleting}
            aria-label="Delete item"
            title="Delete"
            className="p-1.5 rounded-md text-zinc-500 hover:text-danger hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Series progress */}
      {isSeries && <SeasonProgress item={item} />}

      {/* Notes */}
      {item.payload.notes && (
        <p className="text-xs text-zinc-400 line-clamp-2">
          {item.payload.notes}
        </p>
      )}

      {/* Footer meta */}
      <div className="flex items-center gap-2 flex-wrap mt-auto">
        {item.payload.genre && (
          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px]">
            {item.payload.genre}
          </span>
        )}
        {item.payload.recommended_by && (
          <span className="text-[10px] text-zinc-500">
            via {item.payload.recommended_by}
          </span>
        )}
        {item.payload.rewatched && item.payload.rewatch_count > 0 && (
          <span className="text-[10px] text-accent">
            ↺ ×{item.payload.rewatch_count}
          </span>
        )}
      </div>
    </motion.article>
  );
}
