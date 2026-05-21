"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wheat, TrendingUp, TrendingDown } from "lucide-react";
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

  const compactCoverage = summary
    ? `${summary.totalCrops} ${summary.totalCrops === 1 ? "crop" : "crops"} · ${summary.totalPeriods} ${summary.totalPeriods === 1 ? "period" : "periods"}`
    : null;

  return (
    <WidgetCard
      title="Crop History"
      icon={Wheat}
      loading={loading}
      href="/admin/crop-history"
      accentColor="success"
    >
      <motion.div
        initial={{ opacity: 0.75, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3"
      >
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
                subtext={`${compactCoverage ?? "No history"} · vs ${summary.prevPeriod}`}
                variant={pctChange > 0 ? "success" : "danger"}
              />
            ) : (
              <WidgetHighlight
                icon={Wheat}
                text={summary.bestCropName}
                subtext={`Latest performance · ${compactCoverage ?? "No history"}`}
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
      </motion.div>
    </WidgetCard>
  );
}
