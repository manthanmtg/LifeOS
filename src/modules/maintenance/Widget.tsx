"use client";

import { useState, useEffect, memo } from "react";
import { Wrench, AlertTriangle, Clock } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { motion } from "framer-motion";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface MaintenanceSummary {
  total: number;
  overdue: number;
  upcoming: number;
  completedThisMonth: number;
}

export default memo(function MaintenanceWidget() {
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=maintenance_task", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (ac.signal.aborted) return;
        setLoadError(false);
        if (!ac.signal.aborted) setSummary(d.data ?? null);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="Maintenance"
      icon={Wrench}
      loading={loading}
      href="/admin/maintenance"
    >
      {loadError ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-3"
        >
          <WidgetStat value="—" label="Summary unavailable" />
          <WidgetHighlight
            icon={Wrench}
            text="Unable to load maintenance summary"
            subtext="Please check API access and retry"
            variant="warning"
          />
        </motion.div>
      ) : (
        summary && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-3"
          >
            <WidgetStat
              value={summary.overdue}
              label={summary.overdue > 0 ? "overdue tasks" : "all on schedule"}
            />
            {summary.overdue > 0 ? (
              <WidgetHighlight
                icon={AlertTriangle}
                text={`${summary.overdue} task${summary.overdue !== 1 ? "s" : ""} past due`}
                subtext={
                  summary.upcoming > 0
                    ? `${summary.upcoming} due in the next 30 days`
                    : "needs immediate attention"
                }
                variant="danger"
              />
            ) : summary.upcoming > 0 ? (
              <WidgetHighlight
                icon={Clock}
                text={`${summary.upcoming} task${summary.upcoming !== 1 ? "s" : ""} due soon`}
                subtext={`${summary.completedThisMonth} completed this month`}
                variant="warning"
              />
            ) : (
              <WidgetHighlight
                icon={Wrench}
                text={`${summary.total} task${summary.total !== 1 ? "s" : ""} tracked`}
                subtext={`${summary.completedThisMonth} completed this month`}
                variant="success"
              />
            )}
          </motion.div>
        )
      )}
    </WidgetCard>
  );
});
