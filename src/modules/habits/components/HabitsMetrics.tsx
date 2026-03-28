"use client";

import { motion } from "framer-motion";
import { Target, Flame, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HabitMetricsData } from "./types";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 28;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));

  const pathData = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </svg>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

interface HabitsMetricsProps {
  metrics: HabitMetricsData;
}

export default function HabitsMetrics({ metrics }: HabitsMetricsProps) {
  const cards = [
    {
      label: "Active Habits",
      value: metrics.totalHabits,
      icon: Target,
      iconColor: "text-accent",
      bgIcon: "text-accent",
    },
    {
      label: "Done Today",
      value: `${metrics.completedToday}/${metrics.totalHabits}`,
      icon: CheckCircle2,
      iconColor: "text-success",
      bgIcon: "text-success",
      sub:
        metrics.totalHabits > 0
          ? `${Math.round((metrics.completedToday / metrics.totalHabits) * 100)}%`
          : "0%",
    },
    {
      label: "Best Streak",
      value: `${metrics.bestCurrentStreak}d`,
      icon: Flame,
      iconColor: "text-warning",
      bgIcon: "text-warning",
    },
    {
      label: "Weekly Rate",
      value: `${metrics.weeklyCompletionRate}%`,
      icon: TrendingUp,
      iconColor: metrics.weeklyTrend >= 0 ? "text-success" : "text-danger",
      bgIcon: metrics.weeklyTrend >= 0 ? "text-success" : "text-danger",
      trend: metrics.weeklyTrend,
      sparkline: metrics.last7Days,
      sparklineColor:
        metrics.weeklyTrend >= 0
          ? "var(--color-success)"
          : "var(--color-danger)",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -2 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.07] group-hover:scale-110 transition-transform">
            <card.icon className={cn("w-12 h-12", card.bgIcon)} />
          </div>

          <div className="relative z-10">
            <p className="text-zinc-500 font-bold text-[9px] uppercase tracking-[0.2em] mb-1">
              {card.label}
            </p>
            <h3 className="text-2xl font-black tracking-tight text-zinc-50">
              {card.value}
            </h3>

            {card.sub && (
              <p className="text-xs text-zinc-500 mt-0.5">{card.sub}</p>
            )}

            {card.sparkline && (
              <div className="mt-2 h-7 flex items-end">
                <Sparkline
                  data={card.sparkline}
                  color={card.sparklineColor ?? "var(--color-accent)"}
                />
              </div>
            )}

            {card.trend !== undefined && (
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px] font-black",
                    card.trend >= 0
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger",
                  )}
                >
                  {card.trend >= 0 ? "↑" : "↓"} {Math.abs(card.trend)}%
                </span>
                <span className="text-[9px] text-zinc-600">vs last week</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
