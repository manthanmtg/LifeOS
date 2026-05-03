"use client";

import { useEffect, useState } from "react";
import { Wheat, TrendingUp, TrendingDown, CalendarDays } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import type { CropHistorySummary } from "./insights";

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export default function CropHistoryWidget() {
  const [summary, setSummary] = useState<CropHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=crop_history", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const pctChange =
    summary && summary.prevRevenue > 0
      ? ((summary.latestRevenue - summary.prevRevenue) / summary.prevRevenue) *
        100
      : null;

  return (
    <WidgetCard
      title="Crop History"
      icon={Wheat}
      loading={loading}
      href="/admin/crop-history"
      accentColor="success"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {summary.totalPeriods} periods recorded
            </span>
            <span>{summary.totalCrops} crops</span>
          </div>
        )
      }
    >
      <div className="space-y-3">
        {summary && summary.latestRevenue > 0 ? (
          <>
            <WidgetStat
              value={formatINR(summary.latestRevenue)}
              label={`${summary.bestCropName} · ${summary.latestPeriod}`}
            />
            {pctChange !== null ? (
              <WidgetHighlight
                icon={pctChange > 0 ? TrendingUp : TrendingDown}
                text={`${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}% revenue trend`}
                subtext={`vs ${summary.prevPeriod}`}
                variant={pctChange > 0 ? "success" : "danger"}
              />
            ) : (
              <WidgetHighlight
                icon={Wheat}
                text={summary.bestCropName}
                subtext="Latest performance"
                variant="success"
              />
            )}
          </>
        ) : (
          <div className="space-y-3">
            <WidgetStat value="0" label="revenue data" />
            <WidgetHighlight
              icon={Wheat}
              text="No records yet"
              subtext="Add crop data to see trends"
            />
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
