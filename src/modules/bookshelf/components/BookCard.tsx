"use client";

import { motion } from "framer-motion";
import {
  Edit3,
  Trash2,
  BookOpen,
  Star,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES, type Book } from "./types";

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  isDeletingId: string | null;
  index: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

function ReadingProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const progress = Math.min(100, (current / total) * 100);

  return (
    <div className="mt-auto pt-2">
      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
        <span className="tabular-nums">
          {current}/{total} pages
        </span>
        <span className="font-medium tabular-nums">{progress.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3 h-3",
            star <= rating ? "text-warning" : "text-zinc-700",
          )}
          fill={star <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function formatRelativeDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function BookCard({
  book,
  onEdit,
  onDelete,
  isDeletingId,
  index,
}: BookCardProps) {
  const { payload } = book;
  const total = payload.total_pages || 0;
  const current = payload.current_page || 0;
  const isDeleting = isDeletingId === book._id;
  const finishedDate = formatRelativeDate(payload.finished_at);
  const startedDate = formatRelativeDate(payload.started_at);

  return (
    <motion.article
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group relative overflow-hidden"
    >
      {/* Subtle gradient accent based on status */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-px",
          payload.status === "reading" &&
            "bg-gradient-to-r from-transparent via-warning/40 to-transparent",
          payload.status === "completed" &&
            "bg-gradient-to-r from-transparent via-success/40 to-transparent",
          payload.status === "want_to_read" &&
            "bg-gradient-to-r from-transparent via-accent/30 to-transparent",
        )}
      />

      <div className="flex items-start gap-3">
        {/* Cover */}
        <div className="w-14 h-20 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
          {payload.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payload.cover_url}
              alt={payload.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-4 h-4 text-zinc-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-50 line-clamp-2 leading-snug">
            {payload.title}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {payload.author}
          </p>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                STATUS_STYLES[payload.status as keyof typeof STATUS_STYLES],
              )}
            >
              {STATUS_LABELS[payload.status as keyof typeof STATUS_LABELS]}
            </span>
            {payload.rating ? <StarRating rating={payload.rating} /> : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(book)}
            disabled={isDeleting}
            aria-label="Edit book"
            title="Edit book"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(book._id)}
            disabled={isDeleting}
            aria-label="Delete book"
            title="Delete book"
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

      {/* Date info */}
      {(finishedDate || startedDate) && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Calendar className="w-3 h-3" />
          {payload.status === "completed" && finishedDate
            ? `Finished ${finishedDate}`
            : startedDate
              ? `Started ${startedDate}`
              : null}
        </div>
      )}

      {/* Progress bar for books with pages */}
      {total > 0 && payload.status !== "completed" && (
        <ReadingProgress current={current} total={total} />
      )}

      {/* Summary */}
      {payload.summary && (
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {payload.summary}
        </p>
      )}

      {/* Tags */}
      {payload.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {payload.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 text-[10px] hover:text-zinc-400 transition-colors"
            >
              {tag}
            </span>
          ))}
          {payload.tags.length > 4 && (
            <span className="px-2 py-0.5 rounded-md text-zinc-600 text-[10px]">
              +{payload.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </motion.article>
  );
}
