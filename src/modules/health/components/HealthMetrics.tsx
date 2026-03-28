"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Pill,
  Syringe,
  Stethoscope,
  AlertTriangle,
  Activity,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthProfile, ProfileAlert } from "./types";
import {
  getDueStatus,
  daysUntil,
  calculateBMI,
  bmiCategory,
} from "./types";

interface HealthMetricsProps {
  profiles: HealthProfile[];
  alerts: ProfileAlert[];
}

function MiniSparkline({
  data,
  color = "var(--color-accent)",
  height = 28,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 80;
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,${height} ${points} ${width},${height}`;
  const gradientId = `spark-health-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-20 h-7"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function HealthMetrics({
  profiles,
  alerts,
}: HealthMetricsProps) {
  const stats = useMemo(() => {
    let totalConditions = 0;
    let activeConditions = 0;
    let totalMeds = 0;
    let activeMeds = 0;
    let totalVisits = 0;
    let totalVaccinations = 0;
    let totalLabResults = 0;
    const visitCostsByMonth: number[] = [];

    for (const p of profiles) {
      const pl = p.payload;
      totalConditions += pl.conditions.length;
      activeConditions += pl.conditions.filter((c) => c.status !== "resolved").length;
      totalMeds += pl.medications.length;
      activeMeds += pl.medications.filter((m) => m.status === "active").length;
      totalVisits += pl.visits.length;
      totalVaccinations += pl.vaccinations.length;
      totalLabResults += pl.lab_results.length;

      for (const v of pl.visits) {
        if (v.cost && v.cost > 0) {
          const month = new Date(v.date).getMonth();
          visitCostsByMonth[month] = (visitCostsByMonth[month] || 0) + v.cost;
        }
      }
    }

    // Fill sparse array
    const costTrend = Array.from({ length: 6 }, (_, i) => {
      const monthIdx = (new Date().getMonth() - 5 + i + 12) % 12;
      return visitCostsByMonth[monthIdx] || 0;
    });

    // Weight trend across all profiles (latest per profile)
    const weightTrend: number[] = [];
    for (const p of profiles) {
      const sorted = [...p.payload.measurements]
        .filter((m) => m.weight_kg)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (const m of sorted) {
        if (m.weight_kg) weightTrend.push(m.weight_kg);
      }
    }

    return {
      totalProfiles: profiles.length,
      activeConditions,
      totalConditions,
      activeMeds,
      totalMeds,
      totalVisits,
      totalVaccinations,
      totalLabResults,
      alertCount: alerts.length,
      costTrend,
      weightTrend: weightTrend.slice(-8),
    };
  }, [profiles, alerts]);

  const metrics = useMemo(
    () => [
      {
        label: "Profiles",
        value: stats.totalProfiles,
        icon: HeartPulse,
        color: "text-accent",
        sparkData: null as number[] | null,
        sparkColor: "",
      },
      {
        label: "Active Conditions",
        value: stats.activeConditions,
        icon: AlertTriangle,
        color: stats.activeConditions > 0 ? "text-warning" : "text-success",
        sparkData: null,
        sparkColor: "",
      },
      {
        label: "Active Meds",
        value: stats.activeMeds,
        icon: Pill,
        color: "text-success",
        sparkData: null,
        sparkColor: "",
      },
      {
        label: "Visits",
        value: stats.totalVisits,
        icon: Stethoscope,
        color: "text-blue-400",
        sparkData: stats.costTrend,
        sparkColor: "var(--color-accent)",
      },
      {
        label: "Vaccinations",
        value: stats.totalVaccinations,
        icon: Syringe,
        color: "text-teal-400",
        sparkData: null,
        sparkColor: "",
      },
      {
        label: "Lab Results",
        value: stats.totalLabResults,
        icon: Activity,
        color: "text-purple-400",
        sparkData: null,
        sparkColor: "",
      },
    ],
    [stats],
  );

  if (profiles.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700/80 transition-all group hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  {m.label}
                </p>
                <p className={cn("text-2xl font-bold", m.color)}>{m.value}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-zinc-800/50">
                <m.icon className={cn("w-4 h-4", m.color)} />
              </div>
            </div>
            {m.sparkData && m.sparkData.some((v) => v > 0) && (
              <div className="mt-2 -mx-1">
                <MiniSparkline data={m.sparkData} color={m.sparkColor} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-warning/5 backdrop-blur-sm border border-warning/20 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-xs font-bold text-warning uppercase tracking-widest">
              {alerts.length} Alert{alerts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-zinc-300">
                  {a.profileName} — {a.label}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    a.status === "overdue" ? "text-danger" : "text-warning",
                  )}
                >
                  {a.status === "overdue"
                    ? `Overdue ${Math.abs(daysUntil(a.date)!)}d`
                    : `${daysUntil(a.date)}d left`}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
