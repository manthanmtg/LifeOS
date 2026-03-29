"use client";

import { useState, useEffect } from "react";
import {
  HeartPulse,
  AlertTriangle,
  Calendar,
  Pill,
  Syringe,
  Activity,
  User,
  Users,
  PawPrint,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { cn } from "@/lib/utils";

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

function ProfileTypeIcon({ type }: { type: string }) {
  if (type === "pet") return <PawPrint className="w-3 h-3 text-accent/70" />;
  if (type === "family") return <Users className="w-3 h-3 text-accent/70" />;
  return <User className="w-3 h-3 text-accent/70" />;
}

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

          {/* 3-column stats */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
            >
              <Pill className="w-3 h-3 text-accent mb-1" />
              <p className="text-sm font-bold text-accent tabular-nums">
                {summary.activeMedCount}
              </p>
              <p className="text-[9px] text-zinc-600 font-medium leading-tight">
                Meds
              </p>
            </motion.div>

            <motion.div
              custom={2}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
            >
              <Activity className="w-3 h-3 text-warning mb-1" />
              <p className="text-sm font-bold text-warning tabular-nums">
                {summary.activeConditionCount}
              </p>
              <p className="text-[9px] text-zinc-600 font-medium leading-tight">
                Conditions
              </p>
            </motion.div>

            <motion.div
              custom={3}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "rounded-lg border bg-zinc-950/50 p-2",
                summary.alertCount > 0
                  ? "border-danger/30"
                  : "border-zinc-800",
              )}
            >
              <AlertTriangle
                className={cn(
                  "w-3 h-3 mb-1",
                  summary.alertCount > 0 ? "text-danger" : "text-zinc-700",
                )}
              />
              <p
                className={cn(
                  "text-sm font-bold tabular-nums",
                  summary.alertCount > 0 ? "text-danger" : "text-zinc-600",
                )}
              >
                {summary.alertCount}
              </p>
              <p className="text-[9px] text-zinc-600 font-medium leading-tight">
                Alerts
              </p>
            </motion.div>
          </div>

          {/* Profiles list */}
          <div className="flex-1 space-y-1.5 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {summary.profiles.slice(0, 3).map((profile, i) => (
                <motion.div
                  key={profile.name}
                  custom={i + 4}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="group flex items-center gap-2.5 p-2 bg-zinc-900/40 border border-zinc-800/40 rounded-xl hover:border-accent/30 transition-all cursor-pointer"
                  onClick={() => (window.location.href = "/admin/health")}
                >
                  <ProfileTypeIcon type={profile.type} />
                  <span className="text-[11px] text-zinc-300 truncate font-bold tracking-tight group-hover:text-zinc-100 transition-colors flex-1">
                    {profile.name}
                  </span>
                  {profile.alertCount > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-danger/10 border border-danger/20">
                      <span className="text-[9px] font-bold text-danger">
                        {profile.alertCount}
                      </span>
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {summary.total === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-zinc-900/50 rounded-2xl"
              >
                <ShieldCheck className="w-6 h-6 text-success/20 mb-2" />
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                  No profiles yet
                </span>
              </motion.div>
            )}
          </div>

          {/* Quick action */}
          <motion.div
            custom={7}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <button
              onClick={() => (window.location.href = "/admin/health")}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-zinc-950 rounded-xl hover:bg-accent-hover transition-all active:scale-95 shadow-lg shadow-accent/10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Log Visit
              </span>
            </button>
          </motion.div>
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
