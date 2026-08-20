"use client";

import { useMemo, useState, useEffect, memo } from "react";
import { PenLine, Star, Globe } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface WhiteboardSummary {
  total: number;
  favorites: number;
  publicCount: number;
  latest: {
    name: string;
    is_favorite: boolean;
    updated_at: string;
  } | null;
}

export default memo(function WhiteboardWidget() {
  const [summary, setSummary] = useState<WhiteboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAtMs, setLoadedAtMs] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=whiteboard_note", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        setLoadedAtMs(Date.now());
        setSummary(d.data || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const daysAgo = useMemo(() => {
    if (!summary?.latest || loadedAtMs === null) return null;
    return Math.floor(
      (loadedAtMs - new Date(summary.latest.updated_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }, [summary, loadedAtMs]);

  return (
    <WidgetCard
      title="Whiteboard"
      icon={PenLine}
      loading={loading}
      href="/admin/whiteboard"
      footer={
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <div className="flex items-center gap-3">
            {(summary?.favorites ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <Star className="w-3 h-3" fill="currentColor" />{" "}
                {summary?.favorites}
              </span>
            )}
            {(summary?.publicCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-success">
                <Globe className="w-3 h-3" /> {summary?.publicCount}
              </span>
            )}
          </div>
          {daysAgo !== null && (
            <span>
              {daysAgo === 0
                ? "edited today"
                : daysAgo === 1
                  ? "edited yesterday"
                  : `edited ${daysAgo}d ago`}
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <WidgetStat value={summary?.total ?? 0} label="whiteboards" />
        </motion.div>
        <motion.div
          key={summary?.latest?.name ?? "empty"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
        >
          {summary?.latest ? (
            <WidgetHighlight
              icon={summary.latest.is_favorite ? Star : PenLine}
              text={summary.latest.name}
              subtext={summary.latest.is_favorite ? "favorite" : "last edited"}
              variant={summary.latest.is_favorite ? "warning" : "default"}
            />
          ) : (
            <WidgetHighlight icon={PenLine} text="No boards yet" />
          )}
        </motion.div>
      </div>
    </WidgetCard>
  );
});
