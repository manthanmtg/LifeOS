"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Library,
  BookOpen,
  BookCheck,
  BookMarked,
  TrendingUp,
  Star,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import type { Book, BookshelfStats } from "./types";

interface BookshelfMetricsProps {
  books: Book[];
  stats: BookshelfStats;
  loading?: boolean;
}

let sparklineIdCounter = 0;

function MiniSparkline({
  data,
  color = "var(--accent)",
  height = 28,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const gradientId = useMemo(() => `spark-${++sparklineIdCounter}`, []);
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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-20 h-7"
      preserveAspectRatio="none"
      aria-hidden="true"
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

export default function BookshelfMetrics({
  books,
  stats,
  loading = false,
}: BookshelfMetricsProps) {
  const recentActivity = useMemo(() => {
    if (loading) return 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return books.filter(
      (b) =>
        b.payload.status === "completed" &&
        b.payload.finished_at &&
        new Date(b.payload.finished_at) >= thirtyDaysAgo,
    ).length;
  }, [books, loading]);

  const topRatedRecent = useMemo(() => {
    return books
      .filter((b) => b.payload.rating && b.payload.rating >= 4)
      .sort((a, b) => (b.payload.rating || 0) - (a.payload.rating || 0))
      .slice(0, 3);
  }, [books]);

  const metrics = [
    {
      label: "Total Books",
      value: stats.total,
      icon: Library,
      color: "text-zinc-50",
      sparkData: stats.monthlyCompletions,
      sparkColor: "var(--accent)",
    },
    {
      label: "Currently Reading",
      value: stats.reading,
      icon: BookOpen,
      color: "text-warning",
      detail: stats.reading > 0 ? "active" : "idle",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: BookCheck,
      color: "text-success",
      sparkData: stats.monthlyCompletions,
      sparkColor: "var(--success)",
      detail: recentActivity > 0 ? `+${recentActivity} this month` : undefined,
    },
    {
      label: "Want to Read",
      value: stats.wantToRead,
      icon: BookMarked,
      color: "text-accent",
    },
    {
      label: "Avg Rating",
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—",
      icon: Star,
      color: "text-warning",
      detail:
        stats.avgRating > 0
          ? `from ${books.filter((b) => b.payload.rating).length} rated`
          : undefined,
    },
    {
      label: "Pages Read",
      value:
        stats.totalPagesRead >= 1000
          ? `${(stats.totalPagesRead / 1000).toFixed(1)}k`
          : stats.totalPagesRead,
      icon: TrendingUp,
      color: "text-accent",
      detail:
        stats.avgPagesPerBook > 0
          ? `~${Math.round(stats.avgPagesPerBook)} avg/book`
          : undefined,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 flex flex-col gap-1.5 animate-pulse"
            >
              <SkeletonBlock className="h-3.5 w-3.5" />
              <SkeletonBlock className="h-6 w-12" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 flex flex-col gap-1.5 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <m.icon className={cn("w-3.5 h-3.5", m.color)} />
              {m.sparkData && m.sparkData.some((v) => v > 0) && (
                <MiniSparkline data={m.sparkData} color={m.sparkColor} />
              )}
            </div>
            <p className={cn("text-xl font-bold tracking-tight", m.color)}>
              {m.value}
            </p>
            <p className="text-[10px] text-zinc-500 leading-tight">{m.label}</p>
            {m.detail && (
              <p className="text-[10px] text-zinc-600">{m.detail}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Goal progress + top rated section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {stats.goal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-zinc-400">
                Yearly Goal
              </span>
              <span className="ml-auto text-sm font-bold text-zinc-50">
                {stats.completed}/{stats.goal}
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-zinc-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={stats.completed}
              aria-valuemin={0}
              aria-valuemax={stats.goal}
              aria-label="Yearly books completed goal progress"
            >
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.goalProgress}%` }}
                transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-zinc-600">
                {stats.goalProgress.toFixed(0)}% complete
              </span>
              {stats.goal - stats.completed > 0 && (
                <span className="text-[10px] text-zinc-600">
                  {stats.goal - stats.completed} to go
                </span>
              )}
            </div>
          </motion.div>
        )}

        {topRatedRecent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-warning" fill="currentColor" />
              <span className="text-xs font-medium text-zinc-400">
                Top Rated
              </span>
            </div>
            <div className="space-y-2">
              {topRatedRecent.map((book) => (
                <div key={book._id} className="flex items-center gap-2 text-xs">
                  <span className="text-warning font-medium min-w-[24px]">
                    {book.payload.rating}★
                  </span>
                  <span className="text-zinc-300 truncate flex-1">
                    {book.payload.title}
                  </span>
                  <span className="text-zinc-600 truncate max-w-[100px]">
                    {book.payload.author}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
