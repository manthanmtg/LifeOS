"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Tv, Star, Play } from "lucide-react";
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

export default memo(function BingeWidget() {
  const [summary, setSummary] = useState<BingeSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const ratingBadgeClass =
    loadError || summary.avgRating === 0
      ? "text-zinc-500 bg-zinc-800/60 border-zinc-700/60"
      : summary.avgRating >= 8
        ? "text-success bg-success/10 border-success/40"
        : summary.avgRating >= 6
          ? "text-warning bg-warning/10 border-warning/40"
          : "text-danger bg-danger/10 border-danger/40";

  const footerRating =
    loadError || summary.avgRating === 0 ? "—" : summary.avgRating.toFixed(1);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=binge_item", {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load binge summary");
        }
        return res.json();
      })
      .then((data) => {
        setLoadError(false);
        setSummary(data.data || EMPTY_SUMMARY);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <WidgetCard
      title="Binge"
      icon={Tv}
      loading={loading}
      href="/admin/binge"
      footer={
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-zinc-400">
            <Tv className="w-3 h-3" /> {summary.total} titles
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1",
              loadError || summary.avgRating === 0
                ? "text-zinc-500 bg-zinc-800/60 border-zinc-700/60"
                : ratingBadgeClass,
            )}
          >
            <Star
              className="w-3 h-3"
              fill={footerRating !== "—" ? "currentColor" : "none"}
            />
            {footerRating}
          </span>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="space-y-3">
          <WidgetStat
            value={summary.watchingCount}
            label="currently watching"
          />
          {loadError ? (
            <WidgetHighlight
              icon={AlertTriangle}
              text="Binge summary unavailable"
              subtext="Open Binge to verify data and retry."
              variant="danger"
            />
          ) : summary.latest ? (
            <WidgetHighlight
              icon={Play}
              text={summary.latest.title}
              variant="accent"
              subtext={
                summary.latest.current_season
                  ? `S${summary.latest.current_season}${summary.latest.current_episode ? ` · E${summary.latest.current_episode}` : ""}`
                  : undefined
              }
            />
          ) : (
            <WidgetHighlight
              icon={Tv}
              text={summary.total > 0 ? "No active watch" : "Nothing queued up"}
              subtext={
                summary.total > 0
                  ? "Open an item to resume progress"
                  : "Add a title to build your watch list"
              }
            />
          )}
        </div>
      </motion.div>
    </WidgetCard>
  );
});
