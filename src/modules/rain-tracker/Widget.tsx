"use client";

import { useEffect, useState, useMemo } from "react";
import { CloudRain, Droplets } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetHighlight,
  WidgetStat,
} from "@/components/dashboard/widget-primitives";
import type { RainDisplayUnit, RainSummary } from "./types";
import {
  CONVERSION_FROM_MM,
  DISPLAY_UNIT_LABELS,
  formatRainDisplay,
} from "./utils";

export default function RainTrackerWidget() {
  const { settings } = useModuleSettings<{ defaultUnit: RainDisplayUnit }>(
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
        last7: formatRainDisplay(0, displayUnit),
        last30: formatRainDisplay(0, displayUnit),
        latestEntryLabel: "None",
        rainyDaysLabel: "0 rainy days",
      };
    return {
      last7: formatRainDisplay(data.last7Mm * rate, displayUnit),
      last30: formatRainDisplay(data.last30Mm * rate, displayUnit),
      latestEntryLabel: data.latestEntryDate
        ? new Date(data.latestEntryDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "None",
      rainyDaysLabel: `${data.rainyDays} rainy ${data.rainyDays === 1 ? "day" : "days"}`,
    };
  }, [data, displayUnit]);

  return (
    <WidgetCard
      title="Precipitation"
      icon={CloudRain}
      loading={loading}
      href="/admin/rain-tracker"
    >
      <div className="space-y-3">
        <WidgetStat
          value={stats.last7}
          label={`Last 7 days (${DISPLAY_UNIT_LABELS[displayUnit]})`}
        />
        {data?.latestEntryDate ? (
          <WidgetHighlight
            icon={Droplets}
            text={`Latest log ${stats.latestEntryLabel}`}
            subtext={`${stats.last30} over ${stats.rainyDaysLabel}`}
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
