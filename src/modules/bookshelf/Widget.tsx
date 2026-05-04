"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Library, BookOpen, Star, TrendingUp } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
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
              fill={avgRating > 0 ? "currentColor" : "none"}
            />
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
          </span>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="space-y-3"
      >
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
      </motion.div>
    </WidgetCard>
  );
}
