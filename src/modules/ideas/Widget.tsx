"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Sparkles, AlertTriangle, Timer } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetMiniStats,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface IdeaSummary {
  total: number;
  promoted: number;
  exploring: number;
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
        {summary ? (
          <WidgetStat value={summary.total} label="captured ideas" />
        ) : (
          <WidgetHighlight
            icon={AlertTriangle}
            text={
              loadError
                ? "Idea metrics unavailable"
                : "Preparing your idea board"
            }
            subtext={loadError ? "Open Ideas to retry" : "Summary data loading soon"}
            variant={loadError ? "danger" : "accent"}
          />
        )}
        {summary ? (
          summary.total === 0 ? (
            <WidgetHighlight
              icon={Lightbulb}
              text="No ideas yet"
              subtext="Capture your first thought to get momentum."
            />
          ) : summary.reviewCount > 0 ? (
            <WidgetMiniStats
              stats={[
                {
                  value: summary.promoted,
                  label: "promoted",
                  icon: Sparkles,
                  color: "success",
                },
                {
                  value: summary.exploring,
                  label: "exploring",
                  icon: Timer,
                  color: "warning",
                },
                {
                  value: summary.reviewCount,
                  label: "review needed",
                  icon: AlertTriangle,
                  color: "danger",
                },
              ]}
            />
          ) : (
            <WidgetHighlight
              icon={Lightbulb}
              text={summary.spotlightTitle ?? "All ideas are in motion"}
              subtext={
                summary.spotlightStatus
                  ? `Top focus: ${summary.spotlightStatus}`
                  : "Review queue is clear."
              }
              variant="success"
            />
          )
        ) : (
        )}
      </div>
    </WidgetCard>
  );
}
