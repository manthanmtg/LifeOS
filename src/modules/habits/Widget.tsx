"use client";

import { useState, useEffect, useMemo } from "react";
import { Target, Flame, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { Habit, computeMetrics } from "./components/types";

export default function HabitsWidget() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content?module_type=habit", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setHabits(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => computeMetrics(habits), [habits]);

  return (
    <WidgetCard
      title="Habits"
      icon={Target}
      loading={loading}
      href="/admin/habits"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span
            className={cn(
              "flex items-center gap-1",
              metrics.weeklyTrend >= 0 ? "text-success" : "text-danger",
            )}
          >
            <TrendingUp className="w-3 h-3" />
            {metrics.weeklyCompletionRate}% weekly
          </span>
          {metrics.bestCurrentStreak > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <Flame className="w-3 h-3" />
              {metrics.bestCurrentStreak}d streak
            </span>
          )}
        </div>
      }
    >
      <div className="py-2">
        <p className="text-4xl font-bold text-zinc-50 tracking-tight">
          {metrics.completedToday}
          <span className="text-2xl text-zinc-500">/{metrics.totalHabits}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1 font-medium italic">
          completed today
        </p>
        {/* 7-day sparkline bars */}
        <div className="mt-4 flex items-end gap-1 h-8">
          {metrics.last7Days.map((pct, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${Math.max(pct, 8)}%`, opacity: 0.8 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
              whileHover={{ 
                opacity: 1, 
                scaleX: 1.1,
                filter: "brightness(1.2)"
              }}
              className="flex-1 rounded-t-[2px] transition-colors relative group/bar"
              style={{
                backgroundColor:
                  pct >= 70
                    ? "var(--color-success)"
                    : pct >= 40
                      ? "var(--color-warning)"
                      : "var(--color-zinc-700)",
              }}
              title={`${pct}% completion`}
            >
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity text-[8px] font-bold text-zinc-400">
                {pct}%
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
