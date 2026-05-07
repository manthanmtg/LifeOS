"use client";

import { useState, useEffect, memo } from "react";
import { AlertCircle, Map, CheckCircle } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface CompassSummary {
  total: number;
  inProgressCount: number;
  criticalCount: number;
  reviewCount: number;
}

export default memo(function CompassWidget() {
  const [summary, setSummary] = useState<CompassSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=compass_task", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const inProgressCount = summary?.inProgressCount ?? 0;
  const criticalCount = summary?.criticalCount ?? 0;
  const reviewCount = summary?.reviewCount ?? 0;
  const total = summary?.total ?? 0;

  return (
    <WidgetCard
      title="Compass"
      icon={Map}
      loading={loading}
      href="/admin/compass"
      accentColor="accent"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {reviewCount} in review
          </span>
          <span>{total} total</span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={inProgressCount}
          label={inProgressCount === 0 ? "no active tasks" : "in progress"}
        />
        {criticalCount > 0 ? (
          <WidgetHighlight
            icon={AlertCircle}
            text={`${criticalCount} critical path item${criticalCount !== 1 ? "s" : ""}`}
            variant="danger"
          />
        ) : reviewCount > 0 ? (
          <WidgetHighlight
            icon={CheckCircle}
            text={`${reviewCount} awaiting review`}
            variant="warning"
          />
        ) : (
          <WidgetHighlight icon={Map} text="No items need attention" />
        )}
      </div>
    </WidgetCard>
  );
});
