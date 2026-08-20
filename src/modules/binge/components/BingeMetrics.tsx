"use client";

import { useId, useMemo } from "react";
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
import { buildBingeStats } from "./helpers";

function Sparkline({
  data,
  color,
  height = 28,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  // useId gives each instance a stable, unique ID so co-rendered sparklines
  // don't share the same SVG linearGradient id.
  const uid = useId();
  const gradientId = `spark-${uid.replace(/:/g, "")}`;

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
  monthAnchor: Date | null;
}

export default function BingeMetrics({
  items,
  monthAnchor,
}: BingeMetricsProps) {
  const stats = useMemo(() => {
    return buildBingeStats(items, monthAnchor);
  }, [items, monthAnchor]);

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
      color: "text-accent",
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
      color: "text-accent",
    },
    {
      label: "Series",
      value: stats.series,
      icon: Tv,
      color: "text-accent",
    },
    {
      label: "Anime",
      value: stats.anime,
      icon: Clapperboard,
      color: "text-danger",
    },
    {
      label: "Docs",
      value: stats.docs,
      icon: Film,
      color: "text-warning",
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
              <p className="text-xs text-zinc-500">{t.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
