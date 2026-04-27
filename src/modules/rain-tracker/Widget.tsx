"use client";

import { useEffect, useState, useMemo } from "react";
import { CloudRain, Droplets } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetHighlight,
  WidgetStat,
} from "@/components/dashboard/widget-primitives";
import type { RainSummary } from "./types";

const CONVERSION_FROM_MM: Record<"mm" | "cm" | "in", number> = {
  mm: 1,
  cm: 0.1,
  in: 0.0393701,
};

export default function RainTrackerWidget() {
  const { settings } = useModuleSettings<{ defaultUnit: "mm" | "cm" | "in" }>(
    "rainTrackerSettings",
    { defaultUnit: "mm" },
  );
  const displayUnit = settings.defaultUnit || "mm";

  const [data, setData] = useState<RainSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=rain_entry", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setData(d.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const stats = useMemo(() => {
    const rate = CONVERSION_FROM_MM[displayUnit];
    if (!data)
      return {
        last7: "0.0",
        last30: "0.0",
        total: "0.0",
        rainyDays: "0",
        latestEntryLabel: "None",
      };
    return {
      last7: (data.last7Mm * rate).toFixed(1),
      last30: (data.last30Mm * rate).toFixed(1),
      total: (data.totalMm * rate).toFixed(1),
      rainyDays: String(data.rainyDays ?? 0),
      latestEntryLabel: data.latestEntryDate
        ? new Date(data.latestEntryDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "None",
    };
  }, [data, displayUnit]);

  return (
    <WidgetCard
      title="Precipitation"
      icon={CloudRain}
      loading={loading}
      href="/admin/rain-tracker"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span>
            {stats.total} {displayUnit} total
          </span>
          <span>{stats.rainyDays} rainy days</span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={stats.last7}
          label={`Last 7 days (${displayUnit})`}
        />
        {data?.latestEntryDate ? (
          <WidgetHighlight
            icon={Droplets}
            text={`Latest log ${stats.latestEntryLabel}`}
            subtext={`${stats.last30} ${displayUnit} over the last 30 days`}
            variant="accent"
          />
        ) : (
          <WidgetHighlight
            icon={CloudRain}
            text="No rainfall logged yet"
            subtext="Add an entry to start tracking trends."
          />
        )}
      </div>
    </WidgetCard>
  );
}
