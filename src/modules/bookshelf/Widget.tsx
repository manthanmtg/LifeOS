"use client";

import { useState, useEffect } from "react";
import { Library, BookOpen, Star, TrendingUp } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { cn } from "@/lib/utils";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface BookshelfSummary {
  total: number;
  completedCount: number;
  avgRating: number;
  pagesRead: number;
  current: {
    title: string;
    author: string;
    progress: number;
  } | null;
}

export default function BookshelfWidget() {
  const [summary, setSummary] = useState<BookshelfSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=book", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setSummary(data.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const total = summary?.total ?? 0;
  const avgRating = summary?.avgRating ?? 0;
  const pagesLabel =
    (summary?.pagesRead ?? 0) >= 1000
      ? `${((summary?.pagesRead ?? 0) / 1000).toFixed(1)}k`
      : String(summary?.pagesRead ?? 0);
  const ratingBadgeClass =
    avgRating >= 4.5
      ? "border-accent/30 bg-accent/10 text-accent/90"
      : avgRating >= 3.5
        ? "border-success/30 bg-success/10 text-success"
        : avgRating > 0
          ? "border-warning/30 bg-warning/10 text-warning"
          : "border-zinc-700 bg-zinc-800 text-zinc-500";

  return (
    <WidgetCard
      title="Library"
      icon={Library}
      loading={loading}
      href="/admin/bookshelf"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent/80">
            <TrendingUp className="w-3 h-3" /> {pagesLabel} pages
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
              ratingBadgeClass,
            )}
          >
            <Star
              className="w-3 h-3"
              fill={avgRating > 0 ? "currentColor" : "none"}
            />
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={total}
          label={`${summary?.completedCount ?? 0} completed`}
        />
        {summary?.current ? (
          <WidgetHighlight
            icon={BookOpen}
            text={summary.current.title}
            subtext={`${summary.current.progress}% · ${summary.current.author}`}
          />
        ) : (
          <WidgetHighlight
            icon={BookOpen}
            text="No book in progress"
            variant="default"
          />
        )}
      </div>
    </WidgetCard>
  );
}
