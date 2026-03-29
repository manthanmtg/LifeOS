"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Library,
  BookOpen,
  BookCheck,
  BookMarked,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Book {
  payload: {
    title: string;
    author: string;
    status: string;
    current_page: number;
    total_pages?: number;
    rating?: number;
    finished_at?: string;
    tags: string[];
  };
}

function AnimatedBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-zinc-800 border border-zinc-700/50 overflow-hidden">
      <motion.div
        className="h-full bg-accent rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      />
    </div>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function BookshelfWidget() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content?module_type=book", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setBooks(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const reading = books.filter((b) => b.payload.status === "reading");
    const completed = books.filter((b) => b.payload.status === "completed");
    const wantToRead = books.filter(
      (b) => b.payload.status === "want_to_read",
    ).length;

    const ratedBooks = books.filter((b) => !!b.payload.rating);
    const avgRating =
      ratedBooks.reduce((sum, b) => sum + (b.payload.rating || 0), 0) /
      Math.max(1, ratedBooks.length);

    const totalPagesRead = completed.reduce(
      (sum, b) => sum + (b.payload.total_pages || 0),
      0,
    );

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentCompletions = completed.filter(
      (b) =>
        b.payload.finished_at &&
        new Date(b.payload.finished_at) >= thirtyDaysAgo,
    ).length;

    const current = reading[0];
    const progress = current?.payload.total_pages
      ? Math.min(
          100,
          ((current.payload.current_page || 0) / current.payload.total_pages) *
            100,
        )
      : 0;

    return {
      total: books.length,
      readingCount: reading.length,
      completedCount: completed.length,
      wantToRead,
      avgRating: Number.isFinite(avgRating) ? avgRating : 0,
      totalPagesRead,
      recentCompletions,
      current,
      progress,
    };
  }, [books]);

  const pagesLabel =
    summary.totalPagesRead >= 1000
      ? `${(summary.totalPagesRead / 1000).toFixed(1)}k`
      : String(summary.totalPagesRead);

  return (
    <WidgetCard
      title="Library"
      icon={Library}
      loading={loading}
      href="/admin/bookshelf"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-accent/80">
            <TrendingUp className="w-3 h-3" /> {pagesLabel} pages read
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              summary.avgRating > 0 ? "text-warning/80" : "text-zinc-500",
            )}
          >
            <Star
              className="w-3 h-3"
              fill={summary.avgRating > 0 ? "currentColor" : "none"}
            />
            {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "N/A"}
          </span>
        </div>
      }
    >
      <div className="py-2 space-y-4">
        <motion.div
          custom={0}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="text-4xl font-bold text-zinc-50 tracking-tight tabular-nums">
            {summary.total}
          </p>
          <p className="text-xs text-zinc-500 mt-1 font-medium italic">
            books tracked
          </p>
        </motion.div>

        {/* 3-column stat row */}
        <div className="grid grid-cols-3 gap-2">
          <motion.div
            custom={1}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
          >
            <BookOpen className="w-3 h-3 text-warning mb-1" />
            <p className="text-sm font-bold text-warning tabular-nums">
              {summary.readingCount}
            </p>
            <p className="text-[9px] text-zinc-600 font-medium leading-tight">
              Reading
            </p>
          </motion.div>

          <motion.div
            custom={2}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
          >
            <BookCheck className="w-3 h-3 text-success mb-1" />
            <p className="text-sm font-bold text-success tabular-nums">
              +{summary.recentCompletions}
            </p>
            <p className="text-[9px] text-zinc-600 font-medium leading-tight">
              This Month
            </p>
          </motion.div>

          <motion.div
            custom={3}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
          >
            <BookMarked className="w-3 h-3 text-accent mb-1" />
            <p className="text-sm font-bold text-accent tabular-nums">
              {summary.wantToRead}
            </p>
            <p className="text-[9px] text-zinc-600 font-medium leading-tight">
              Backlog
            </p>
          </motion.div>
        </div>

        {/* Now Reading */}
        <motion.div
          custom={4}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          {summary.current ? (
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                  Now Reading
                </p>
                <span className="text-[10px] font-bold text-accent tabular-nums">
                  {summary.progress.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-start gap-2 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-snug">
                    {summary.current.payload.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 line-clamp-1 leading-snug">
                    {summary.current.payload.author}
                  </p>
                </div>
              </div>
              <AnimatedBar
                value={summary.current.payload.current_page || 0}
                max={summary.current.payload.total_pages || 1}
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
              <p className="text-[11px] text-zinc-500 text-center font-medium">
                No book in progress.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </WidgetCard>
  );
}
