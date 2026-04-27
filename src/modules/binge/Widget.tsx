"use client";

import { useState, useEffect } from "react";
import { Tv, Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface BingeSummary {
  total: number;
  watchingCount: number;
  avgRating: number;
  latest: {
    title: string;
    current_season?: number;
    current_episode?: number;
  } | null;
}

const EMPTY_SUMMARY: BingeSummary = {
  total: 0,
  watchingCount: 0,
  avgRating: 0,
  latest: null,
};

export default function BingeWidget() {
  const [summary, setSummary] = useState<BingeSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=binge_item")
      .then((res) => res.json())
      .then((data) => setSummary(data.data || EMPTY_SUMMARY))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Binge"
      icon={Tv}
      loading={loading}
      href="/admin/binge"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Tv className="w-3 h-3" /> {summary.total} titles
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
            {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "—"}
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={summary.watchingCount} label="currently watching" />
        {summary.latest ? (
          <WidgetHighlight
            icon={Play}
            text={summary.latest.title}
            subtext={
              summary.latest.current_season
                ? `S${summary.latest.current_season}${summary.latest.current_episode ? ` · E${summary.latest.current_episode}` : ""}`
                : undefined
            }
          />
        ) : (
          <WidgetHighlight icon={Tv} text="Nothing queued up" />
        )}
      </div>
    </WidgetCard>
  );
}
