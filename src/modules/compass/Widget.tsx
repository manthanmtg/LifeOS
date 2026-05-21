"use client";

import { useState, useEffect, memo } from "react";
import { AlertCircle, CheckCircle, Map } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
  WidgetMiniStats,
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=compass_task", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
        setHasError(true);
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
    >
      {loading ? null : hasError || !summary ? (
        <motion.div
          initial={{ opacity: 0.75 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <WidgetHighlight
            icon={AlertCircle}
            text="Unable to load compass summary"
            variant="warning"
            subtext="Please retry"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <WidgetStat
            value={inProgressCount}
            label={inProgressCount === 0 ? "no active tasks" : "in progress"}
          />
          <WidgetMiniStats
            stats={[
              {
                value: reviewCount,
                label: "in review",
                icon: CheckCircle,
                color: "warning",
              },
              {
                value: criticalCount,
                label: "critical",
                icon: AlertCircle,
                color: "danger",
              },
              {
                value: total,
                label: "total",
                icon: Map,
              },
            ]}
          />
        </motion.div>
      )}
    </WidgetCard>
  );
});
