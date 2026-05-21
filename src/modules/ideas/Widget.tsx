"use client";

import { useState, useEffect } from "react";
import { Lightbulb, AlertTriangle, CheckCheck } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface IdeaSummary {
  total: number;
  reviewCount: number;
  spotlightTitle?: string;
  spotlightStatus?: string;
}

export default function IdeasWidget() {
  const [summary, setSummary] = useState<IdeaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();

    fetch("/api/widgets/summary?module_type=idea", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setSummary(data.data || null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="Ideas"
      icon={Lightbulb}
      loading={loading}
      href="/admin/ideas"
    >
      <div className="space-y-3">
        <WidgetStat
          value={summary?.total ?? 0}
          label="captured ideas"
        />
        <WidgetHighlight
          icon={
            loadError
              ? AlertTriangle
              : summary && summary.reviewCount > 0
                ? CheckCheck
                : Lightbulb
          }
          text={
            loadError
              ? "Idea metrics unavailable"
              : summary
                ? summary.reviewCount > 0
                  ? `${summary.reviewCount} ideas need review`
                  : summary.total === 0
                    ? "No ideas yet"
                    : summary.spotlightTitle || "Review queue is clear."
                : "Preparing your idea board"
          }
          subtext={
            loadError
              ? "Open Ideas to retry"
              : summary
                ? summary.spotlightStatus || "Last update from idea board"
                : "Summary data loading soon"
          }
          variant={loadError ? "danger" : summary?.reviewCount ? "warning" : "accent"}
        />
      </div>
    </WidgetCard>
  );
}
