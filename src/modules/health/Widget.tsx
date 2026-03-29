"use client";

import { useState, useEffect } from "react";
import {
  HeartPulse,
  AlertTriangle,
  Calendar,
  Pill,
  Syringe,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface ProfileSummary {
  name: string;
  type: string;
  alertCount: number;
}

interface HealthSummary {
  total: number;
  alertCount: number;
  activeMedCount: number;
  activeConditionCount: number;
  upcomingVacCount: number;
  latestVisit: { date: string; type: string } | null;
  profiles: ProfileSummary[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.3, ease: "easeOut" as const },
  }),
};



export default function HealthWidget() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=health_profile", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

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
                Last: {summary.latestVisit.type.replace("_", " ")}
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
      {summary && (
        <div className="py-2 space-y-3 h-full flex flex-col">
          {/* Header stat */}
          <motion.div
            custom={0}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="text-4xl font-bold text-zinc-50 tracking-tight tabular-nums">
              {summary.total}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium italic">
              health profile{summary.total !== 1 ? "s" : ""}
            </p>
          </motion.div>

          {/* Summary metrics line */}
          <div className="flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-zinc-100">{summary.activeMedCount}</span>
              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Meds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-bold text-zinc-100">{summary.activeConditionCount}</span>
              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Stats</span>
            </div>
            {summary.alertCount > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                <span className="text-xs font-bold text-danger">{summary.alertCount}</span>
                <span className="text-[9px] text-danger/70 font-bold uppercase tracking-wider">Alerts</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when summary is null after load */}
      {!loading && !summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full py-6 gap-2"
        >
          <HeartPulse className="w-8 h-8 text-zinc-700" />
          <p className="text-[11px] text-zinc-600 font-medium">
            No health data
          </p>
        </motion.div>
      )}
    </WidgetCard>
  );
}
