"use client";

import { useMemo } from "react";
import { ReadingItem } from "../types";
import { motion } from "framer-motion";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import {
  Inbox,
  BookOpen,
  ArrowUpCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface ReadingMetricsProps {
  items: ReadingItem[];
  loading?: boolean;
}

export function ReadingMetrics({ items, loading }: ReadingMetricsProps) {
  const stats = useMemo(() => {
    const total = items.length;
    const unread = items.filter((item) => !item.payload.is_read).length;
    const highPriorityUnread = items.filter(
      (item) => !item.payload.is_read && item.payload.priority === "high",
    ).length;
    const read = items.filter((item) => item.payload.is_read).length;
    const readRate = total > 0 ? (read / total) * 100 : 0;

    return [
      { label: "Total", value: total, color: "text-zinc-50", icon: Inbox },
      { label: "Unread", value: unread, color: "text-zinc-50", icon: BookOpen },
      {
        label: "High Priority",
        value: highPriorityUnread,
        color: "text-danger",
        icon: ArrowUpCircle,
      },
      {
        label: "Completed",
        value: read,
        color: "text-success",
        icon: Sparkles,
      },
      {
        label: "Read Rate",
        value: `${readRate.toFixed(0)}%`,
        color: "text-accent",
        icon: TrendingUp,
      },
    ];
  }, [items]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5 animate-pulse"
            >
              <SkeletonBlock className="h-3 w-12 mb-2" />
              <SkeletonBlock className="h-6 w-16" />
            </div>
          ))
        : stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-zinc-800/50 bg-zinc-950/30 backdrop-blur-sm px-3 py-2.5 hover:bg-zinc-950/50 transition-colors group relative overflow-hidden"
            >
              <stat.icon className="absolute -right-1 -bottom-1 w-8 h-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5 group-hover:text-zinc-400 transition-colors">
                {stat.label}
              </p>
              <p className={`text-xl font-bold tracking-tight ${stat.color}`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
    </div>
  );
}
