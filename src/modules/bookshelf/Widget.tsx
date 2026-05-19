"use client";

import { useState, useEffect } from "react";
import { Library, BookOpen } from "lucide-react";
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=book", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setSummary(data.data ?? null))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setHasError(true);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  const total = summary?.total ?? 0;

  return (
    <WidgetCard
      title="Library"
      icon={Library}
      loading={loading}
      href="/admin/bookshelf"
    >
      {loading ? null : hasError || !summary ? (
        <WidgetHighlight
          icon={Library}
          text="Unable to load bookshelf summary"
          subtext="Check your connection and refresh"
          variant="warning"
        />
      ) : (
        <div className="space-y-3">
          <WidgetStat
            value={total}
            label={`${summary.completedCount} completed`}
          />
          {summary.current ? (
            <WidgetHighlight
              icon={BookOpen}
              text={summary.current.title}
              subtext={`${summary.current.progress}% · ${summary.current.author}`}
            />
          ) : (
            <WidgetHighlight
              icon={BookOpen}
              text={summary.total > 0 ? "No book in progress" : "No books yet"}
              subtext={
                summary.total > 0
                  ? "Start one to see your spotlight."
                  : "Add your first book to begin"
              }
              variant="default"
            />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
