"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Code, Star, Hash, TrendingUp, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet, SnippetStats } from "./types";

interface SnippetsMetricsProps {
  snippets: Snippet[];
  stats: SnippetStats;
}

function MiniSparkline({
  data,
  color = "var(--accent)",
  height = 28,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
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
  const gradientId = `spark-snippets-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

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

export default function SnippetsMetrics({
  snippets,
  stats,
}: SnippetsMetricsProps) {
  const languageDistribution = useMemo(() => {
    const langCounts: Record<string, number> = {};
    for (const s of snippets) {
      langCounts[s.payload.language] =
        (langCounts[s.payload.language] || 0) + 1;
    }
    return Object.entries(langCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [snippets]);

  const recentActivity = useMemo(() => {
    const now = new Date();
    const weeks: number[] = [0, 0, 0, 0, 0, 0];
    for (const s of snippets) {
      const created = new Date(s.created_at);
      const weeksAgo = Math.floor(
        (now.getTime() - created.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      if (weeksAgo >= 0 && weeksAgo < 6) {
        weeks[5 - weeksAgo]++;
      }
    }
    return weeks;
  }, [snippets]);

  const metrics = [
    {
      label: "Total Snippets",
      value: stats.total,
      icon: Code,
      color: "text-zinc-50",
      sparkData: recentActivity,
      sparkColor: "var(--accent)",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Star,
      color: "text-warning",
      detail:
        stats.total > 0
          ? `${Math.round((stats.favorites / stats.total) * 100)}% starred`
          : undefined,
    },
    {
      label: "Languages",
      value: stats.languages,
      icon: Hash,
      color: "text-accent",
    },
    {
      label: "Avg Lines",
      value: stats.averageLength,
      icon: TrendingUp,
      color: "text-success",
      detail: stats.averageLength > 0 ? "lines per snippet" : undefined,
    },
    {
      label: "Recent (7d)",
      value: stats.recentCount,
      icon: Clock,
      color: "text-blue-400",
      detail: stats.recentCount > 0 ? "added this week" : "none this week",
    },
    {
      label: "Unique Tags",
      value: stats.tagCount,
      icon: Tag,
      color: "text-purple-400",
    },
  ];

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

      {languageDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-zinc-400">
              Top Languages
            </span>
          </div>
          <div className="space-y-2">
            {languageDistribution.map(([lang, count]) => {
              const pct =
                stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={lang} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-300 font-medium w-20 truncate">
                    {lang}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-accent/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        delay: 0.5,
                        duration: 0.6,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 min-w-[32px] text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
