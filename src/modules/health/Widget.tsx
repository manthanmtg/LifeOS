"use client";

import { useState, useEffect, memo, useMemo } from "react";
import { HeartPulse, Pill, Calendar, Syringe } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface HealthSummary {
  total: number;
  alertCount: number;
  activeMedCount: number;
  activeConditionCount: number;
  upcomingVacCount: number;
  latestVisit: { date: string; type: string } | null;
  profiles?: Array<{ name: string; type: string; alertCount: number }>;
}

export default memo(function HealthWidget() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=health_profile", {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const attentionProfile = useMemo(
    () =>
      summary?.profiles
        ?.filter((profile) => profile.alertCount > 0)
        .sort((a, b) => b.alertCount - a.alertCount)[0] ?? null,
    [summary],
  );

  const latestVisitLabel = useMemo(() => {
    if (!summary?.latestVisit) return null;

    const visitType = summary.latestVisit.type.replace(/_/g, " ");
    const parsed = new Date(summary.latestVisit.date);
    const visitDate =
      Number.isNaN(parsed.getTime()) === true
        ? "unknown date"
        : parsed.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

    return `${visitType} on ${visitDate}`;
  }, [summary]);

  return (
    <WidgetCard
      title="Health"
      icon={HeartPulse}
      loading={loading}
      href="/admin/health"
      footer={
        summary && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            {summary.latestVisit ? (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Calendar className="w-3 h-3" />
                Last: {latestVisitLabel}
              </span>
            ) : (
              <span className="text-zinc-600">No visits logged</span>
            )}
            {summary.upcomingVacCount > 0 && (
              <span className="flex items-center gap-1.5 text-warning/80">
                <Syringe className="w-3 h-3" />
                {summary.upcomingVacCount} vac due
              </span>
            )}
          </div>
        )
      }
    >
      {summary ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-3"
        >
          <WidgetStat
            value={summary.alertCount}
            label={summary.alertCount > 0 ? "need attention" : "all clear"}
          />
          <WidgetHighlight
            icon={attentionProfile ? HeartPulse : Pill}
            text={
              attentionProfile
                ? `${attentionProfile.name} needs attention`
                : `${summary.activeMedCount} meds · ${summary.activeConditionCount} conditions`
            }
            subtext={
              attentionProfile
                ? `${attentionProfile.alertCount} alert${attentionProfile.alertCount !== 1 ? "s" : ""} on this profile`
                : `${summary.total} profile${summary.total !== 1 ? "s" : ""} tracked`
            }
            variant={summary.alertCount > 0 ? "danger" : "default"}
          />
        </motion.div>
      ) : (
        !loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-3"
          >
            <WidgetStat value={0} label="profiles tracked" />
            <WidgetHighlight
              icon={HeartPulse}
              text="No health data"
              subtext="Set up your first health profile"
              variant="default"
            />
          </motion.div>
        )
      )}
    </WidgetCard>
  );
});
