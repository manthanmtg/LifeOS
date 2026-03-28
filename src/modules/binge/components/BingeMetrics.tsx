"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Tv,
  Play,
  CheckCircle2,
  Star,
  Film,
  Clapperboard,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import type { BingeItem } from "../types";

function Sparkline({
  data,
  color,
  height = 28,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 80;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (v / max) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");
  const gradientId = `spark-${color.replace(/[^a-z0-9]/g, "")}`;
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
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

interface BingeMetricsProps {
  items: BingeItem[];
}

export default function BingeMetrics({ items }: BingeMetricsProps) {
  const stats = useMemo(() => {
    const total = items.length;
    const watching = items.filter(
      (i) => i.payload.status === "watching",
    ).length;
    const completed = items.filter(
      (i) => i.payload.status === "completed",
    ).length;
    const toWatch = items.filter((i) => i.payload.status === "to_watch").length;
    const dropped = items.filter((i) => i.payload.status === "dropped").length;
    const rated = items.filter((i) => !!i.payload.rating);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, i) => sum + (i.payload.rating || 0), 0) /
          rated.length
        : 0;

    const movies = items.filter((i) => i.payload.type === "movie").length;
    const series = items.filter((i) => i.payload.type === "series").length;
    const anime = items.filter((i) => i.payload.type === "anime").length;
    const docs = items.filter((i) => i.payload.type === "documentary").length;

    // Monthly additions for sparkline (last 6 months)
    const now = new Date();
    const monthlyData: number[] = [];
    for (let m = 5; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const count = items.filter((i) => {
        const d = new Date(i.created_at);
        return d >= start && d < end;
      }).length;
      monthlyData.push(count);
    }

    // Completion rate sparkline (last 6 months)
    const completionData: number[] = [];
    for (let m = 5; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const count = items.filter((i) => {
        const d = new Date(i.created_at);
        return d >= start && d < end && i.payload.status === "completed";
      }).length;
      completionData.push(count);
    }

    return {
      total,
      watching,
      completed,
      toWatch,
      dropped,
      avgRating,
      movies,
      series,
      anime,
      docs,
      monthlyData,
      completionData,
    };
  }, [items]);

  const metrics = [
    {
      label: "Total",
      value: stats.total,
      icon: Tv,
      color: "text-zinc-50",
      sparkColor: "var(--color-accent)",
      sparkData: stats.monthlyData,
    },
    {
      label: "Watching",
      value: stats.watching,
      icon: Play,
      color: "text-warning",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-success",
      sparkColor: "var(--color-success)",
      sparkData: stats.completionData,
    },
    {
      label: "Avg Rating",
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—",
      icon: Star,
      color: "text-warning",
    },
    {
      label: "To Watch",
      value: stats.toWatch,
      icon: TrendingUp,
      color: "text-blue-400",
    },
    {
      label: "Dropped",
      value: stats.dropped,
      icon: BarChart3,
      color: "text-zinc-400",
    },
  ];

  const typeBreakdown = [
    {
      label: "Movies",
      value: stats.movies,
      icon: Film,
      color: "text-purple-400",
    },
    {
      label: "Series",
      value: stats.series,
      icon: Tv,
      color: "text-cyan-400",
    },
    {
      label: "Anime",
      value: stats.anime,
      icon: Clapperboard,
      color: "text-pink-400",
    },
    {
      label: "Docs",
      value: stats.docs,
      icon: Film,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{m.label}</span>
              <m.icon className={`w-3.5 h-3.5 ${m.color} opacity-60`} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className={`text-xl font-bold tracking-tight ${m.color}`}>
                {m.value}
              </span>
              {m.sparkData && m.sparkColor && (
                <Sparkline data={m.sparkData} color={m.sparkColor} />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {typeBreakdown.map((t, i) => (
          <motion.div
            key={t.label}
            custom={i + metrics.length}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 flex items-center gap-3"
          >
            <t.icon className={`w-4 h-4 ${t.color} opacity-60`} />
            <div>
              <p className="text-sm font-semibold text-zinc-50">{t.value}</p>
              <p className="text-[10px] text-zinc-500">{t.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
