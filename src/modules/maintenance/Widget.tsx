"use client";

import { useState, useEffect, memo } from "react";
import { Wrench, AlertTriangle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
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

  const hero = summary
    ? summary.overdue > 0
      ? {
          value: summary.overdue,
          label: "overdue tasks",
          tone: "danger" as const,
        }
      : summary.upcoming > 0
        ? {
            value: summary.upcoming,
            label: "due in next 30 days",
            tone: "warning" as const,
          }
        : {
            value: summary.total,
            label: summary.total > 0 ? "active tasks" : "maintenance tasks",
            tone: "success" as const,
          }
    : {
        value: "—" as const,
        label: "maintenance tasks",
        tone: "accent" as const,
      };

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=maintenance_task", {
      signal: ac.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (ac.signal.aborted) return;
        if (!r.ok) {
          setLoadError(true);
          setSummary(null);
          return;
        }
        setLoadError(false);
        setSummary(d.data ?? null);
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
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {loadError ? (
          <div className="space-y-3">
            <WidgetStat value="—" label="Summary unavailable" />
            <WidgetHighlight
              icon={Wrench}
              text="Unable to load maintenance summary"
              subtext="Please check API access and retry"
              variant="warning"
            />
          </div>
        ) : summary ? (
          <div className="space-y-3">
            <WidgetStat value={hero.value} label={hero.label} />
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
                text={
                  summary.total > 0
                    ? `${summary.total} task${summary.total !== 1 ? "s" : ""} tracked`
                    : "Add your first maintenance plan today"
                }
                subtext={`${summary.completedThisMonth} completed this month`}
                variant={hero.tone}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <WidgetStat value="0" label="maintenance tasks" />
            <WidgetHighlight
              icon={Wrench}
              text="No maintenance tasks yet"
              subtext="Add your first maintenance plan to get started"
              variant="accent"
            />
          </div>
        )}
      </motion.div>
    </WidgetCard>
  );
});
