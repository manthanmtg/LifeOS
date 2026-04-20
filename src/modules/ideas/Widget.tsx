"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Sparkles, AlertTriangle } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
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

  useEffect(() => {
    const ac = new AbortController();

    fetch("/api/widgets/summary?module_type=idea", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setSummary(data.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="Ideas"
      icon={Lightbulb}
      loading={loading}
      href="/admin/ideas"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1.5 text-success">
              <Sparkles className="h-3 w-3" /> {summary.promoted} promoted
            </span>
            <span>{summary.exploring} exploring</span>
          </div>
        )
      }
    >
      {summary && (
        <div className="space-y-3">
          <WidgetStat value={summary.total} label="captured concepts" />
          {summary.reviewCount > 0 ? (
            <WidgetHighlight
              icon={AlertTriangle}
              text={`${summary.reviewCount} idea${summary.reviewCount === 1 ? "" : "s"} need review`}
              subtext="high-priority concepts surfaced first"
              variant="warning"
            />
          ) : summary.spotlightTitle ? (
            <WidgetHighlight
              icon={Lightbulb}
              text={summary.spotlightTitle}
              subtext={summary.spotlightStatus}
            />
          ) : (
            <WidgetHighlight icon={Lightbulb} text="No ideas yet" />
          )}
        </div>
      )}
    </WidgetCard>
  );
}
