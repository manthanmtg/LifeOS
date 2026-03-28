"use client";

import { useMemo, useState, useEffect } from "react";
import { Library, BookOpen, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Book {
  payload: {
    title: string;
    status: string;
    current_page: number;
    total_pages?: number;
    rating?: number;
    finished_at?: string;
  };
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 rounded-full bg-zinc-900 border border-zinc-800/50 overflow-hidden">
      <div
        className="h-full bg-accent transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BookshelfWidget() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content?module_type=book", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setBooks(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const reading = books.filter((book) => book.payload.status === "reading");
    const completed = books.filter(
      (book) => book.payload.status === "completed",
    );
    const ratedBooks = books.filter((book) => !!book.payload.rating);
    const avgRating =
      ratedBooks.reduce((sum, book) => sum + (book.payload.rating || 0), 0) /
      Math.max(1, ratedBooks.length);

    // Recent completions (last 30 days)
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
      avgRating: Number.isFinite(avgRating) ? avgRating : 0,
      recentCompletions,
      current,
      progress,
    };
  }, [books]);

  return (
    <WidgetCard
      title="Library"
      icon={Library}
      loading={loading}
      href="/admin/bookshelf"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-success/80">
            <TrendingUp className="w-3 h-3" /> {summary.completedCount}{" "}
            completed
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
        <div>
          <p className="text-4xl font-bold text-zinc-50 tracking-tight tabular-nums">
            {summary.total}
          </p>
          <p className="text-xs text-zinc-500 mt-1 font-medium italic">
            books tracked
          </p>
        </div>

        {/* Reading + completed row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
            <p className="text-[10px] text-zinc-600 font-medium">Reading</p>
            <p className="text-sm font-bold text-warning tabular-nums">
              {summary.readingCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
            <p className="text-[10px] text-zinc-600 font-medium">This Month</p>
            <p className="text-sm font-bold text-success tabular-nums">
              +{summary.recentCompletions}
            </p>
          </div>
        </div>

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
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">
                {summary.current.payload.title}
              </p>
            </div>
            <MiniBar
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
      </div>
    </WidgetCard>
  );
}
