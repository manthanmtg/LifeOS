"use client";

import { useState, useEffect, useMemo } from "react";
import { Library, BookOpen, Star, TrendingUp } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface Book {
  payload: {
    title: string;
    author: string;
    status: string;
    current_page: number;
    total_pages?: number;
    rating?: number;
    finished_at?: string;
  };
}

export default function BookshelfWidget() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/content?module_type=book", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setBooks(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const summary = useMemo(() => {
    const current = books.find((b) => b.payload.status === "reading");
    const completedCount = books.filter(
      (b) => b.payload.status === "completed",
    ).length;
    const rated = books.filter((b) => !!b.payload.rating);
    const avgRating =
      rated.reduce((s, b) => s + (b.payload.rating || 0), 0) /
      Math.max(1, rated.length);
    const pagesRead = books
      .filter((b) => b.payload.status === "completed")
      .reduce((s, b) => s + (b.payload.total_pages || 0), 0);

    const progress = current?.payload.total_pages
      ? Math.round(
          ((current.payload.current_page || 0) / current.payload.total_pages) *
            100,
        )
      : 0;

    return { current, completedCount, avgRating, pagesRead, progress };
  }, [books]);

  const pagesLabel =
    summary.pagesRead >= 1000
      ? `${(summary.pagesRead / 1000).toFixed(1)}k`
      : String(summary.pagesRead);

  return (
    <WidgetCard
      title="Library"
      icon={Library}
      loading={loading}
      href="/admin/bookshelf"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-accent/80">
            <TrendingUp className="w-3 h-3" /> {pagesLabel} pages
          </span>
          <span className="flex items-center gap-1 text-warning/80">
            <Star
              className="w-3 h-3"
              fill={summary.avgRating > 0 ? "currentColor" : "none"}
            />
            {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "—"}
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={books.length}
          label={`${summary.completedCount} completed`}
        />
        {summary.current ? (
          <WidgetHighlight
            icon={BookOpen}
            text={summary.current.payload.title}
            subtext={`${summary.progress}% · ${summary.current.payload.author}`}
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
