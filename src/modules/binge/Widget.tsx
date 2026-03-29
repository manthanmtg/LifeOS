"use client";

import { useMemo, useState, useEffect } from "react";
import { Tv, Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import type { BingeItem } from "./types";

export default function BingeWidget() {
  const [items, setItems] = useState<BingeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=binge_item")
      .then((res) => res.json())
      .then((data) => setItems(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const watching = items.filter((i) => i.payload.status === "watching");
    const rated = items.filter((i) => !!i.payload.rating);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, i) => sum + (i.payload.rating || 0), 0) /
          rated.length
        : 0;
    const latest = watching[watching.length - 1] ?? null;
    return {
      total: items.length,
      watchingCount: watching.length,
      avgRating: Number.isFinite(avgRating) ? avgRating : 0,
      latest,
    };
  }, [items]);

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
        <WidgetStat
          value={summary.watchingCount}
          label="currently watching"
        />
        {summary.latest ? (
          <WidgetHighlight
            icon={Play}
            text={summary.latest.payload.title}
            subtext={
              summary.latest.payload.current_season
                ? `S${summary.latest.payload.current_season}${summary.latest.payload.current_episode ? ` · E${summary.latest.payload.current_episode}` : ""}`
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
