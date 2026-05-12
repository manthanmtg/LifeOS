"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Code,
  Star,
  Hash,
  TrendingUp,
  Clock,
  Tag,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import type { Snippet, SnippetStats } from "./types";

interface SnippetsMetricsProps {
  snippets: Snippet[];
  stats: SnippetStats;
  referenceTime: number;
  loading?: boolean;
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
      className="w-20 h-7 overflow-visible"
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
        strokeWidth="2"
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
  referenceTime,
  loading = false,
}: SnippetsMetricsProps) {
  const languageDistribution = useMemo(() => {
    if (loading) return [];
    const langCounts: Record<string, number> = {};
    for (const s of snippets) {
      langCounts[s.payload.language] =
        (langCounts[s.payload.language] || 0) + 1;
    }
    return Object.entries(langCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [snippets, loading]);

  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    for (const s of snippets) {
      for (const tag of s.payload.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [snippets]);

  const recentActivity = useMemo(() => {
    const weeks: number[] = [0, 0, 0, 0, 0, 0];
    for (const s of snippets) {
      const weeksAgo = Math.floor(
        (referenceTime - Date.parse(s.created_at)) / (7 * 24 * 60 * 60 * 1000),
      );
      if (weeksAgo >= 0 && weeksAgo < 6) {
        weeks[5 - weeksAgo]++;
      }
    }
    return weeks;
  }, [snippets, referenceTime]);

  const metrics = [
    {
      label: "Total Library",
      value: stats.total,
      icon: Code,
      color: "text-zinc-50",
      accentColor: "bg-zinc-50/10",
      sparkData: recentActivity,
      sparkColor: "var(--accent)",
    },
    {
      label: "Favorites",
      value: stats.favorites,
      icon: Star,
      color: "text-warning",
      accentColor: "bg-warning/10",
      detail:
        stats.total > 0
          ? `${Math.round((stats.favorites / stats.total) * 100)}% reach`
          : undefined,
    },
    {
      label: "Tech Stack",
      value: stats.languages,
      icon: Hash,
      color: "text-accent",
      accentColor: "bg-accent/10",
      detail: "languages used",
    },
    {
      label: "Avg Density",
      value: stats.averageLength,
      icon: TrendingUp,
      color: "text-success",
      accentColor: "bg-success/10",
      detail: "lines / snippet",
    },
    {
      label: "Velocity (7d)",
      value: stats.recentCount,
      icon: Clock,
      color: "text-accent",
      accentColor: "bg-accent/10",
      detail: "new arrivals",
    },
    {
      label: "Categorization",
      value: stats.tagCount,
      icon: Tag,
      color: "text-accent",
      accentColor: "bg-accent/10",
      detail: "unique tags",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col gap-2 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-7 w-7 rounded-lg" />
              </div>
              <div className="space-y-2 mt-1">
                <SkeletonBlock className="h-6 w-12" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="group relative rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 flex flex-col gap-2 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <m.icon className="w-12 h-12" />
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className={cn("p-1.5 rounded-lg", m.accentColor)}>
                <m.icon className={cn("w-4 h-4", m.color)} />
              </div>
              {m.sparkData && m.sparkData.some((v) => v > 0) && (
                <div className="pr-1">
                  <MiniSparkline data={m.sparkData} color={m.sparkColor} />
                </div>
              )}
            </div>
            <div className="relative z-10">
              <p className={cn("text-2xl font-black tracking-tight", m.color)}>
                {m.value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
                {m.label}
              </p>
              {m.detail && (
                <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">
                  {m.detail}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {languageDistribution.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                <Code className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-zinc-300">
                Top Languages
              </span>
            </div>
            <div className="space-y-3">
              {languageDistribution.map(([lang, count]) => {
                const pct =
                  stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={lang} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-400">{lang}</span>
                      <span className="text-zinc-500">
                        {count} snippets ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-900 border border-zinc-800/50 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent/40 to-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          delay: 0.6,
                          duration: 0.8,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {topTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-zinc-300">
                Trending Tags
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count], i) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-accent/40 hover:bg-accent/5 transition-all cursor-default"
                >
                  <span className="text-xs font-semibold text-zinc-400 group-hover:text-accent transition-colors">
                    #{tag}
                  </span>
                  <span className="text-[10px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-500 group-hover:text-accent/60 transition-colors">
                    {count}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
