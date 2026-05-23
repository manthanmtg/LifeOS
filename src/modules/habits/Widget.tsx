"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Flame, TrendingUp } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import type { HabitMetricsData } from "./components/types";

const EMPTY_SUMMARY: HabitMetricsData = {
  totalHabits: 0,
  completedToday: 0,
  bestCurrentStreak: 0,
  weeklyCompletionRate: 0,
  weeklyTrend: 0,
  last7Days: [0, 0, 0, 0, 0, 0, 0],
};

export default function HabitsWidget() {
  const [summary, setSummary] = useState<HabitMetricsData>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/widgets/summary?module_type=habit", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setSummary(d.data || EMPTY_SUMMARY))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const streakText =
    summary.bestCurrentStreak > 0
      ? `${summary.bestCurrentStreak}d current streak`
      : "No active streak yet";
  const trendLabel =
    summary.weeklyTrend > 0
      ? `${summary.weeklyTrend}% above last week`
      : summary.weeklyTrend < 0
        ? `${Math.abs(summary.weeklyTrend)}% below last week`
        : "Even with last week";
  const highlightVariant =
    summary.totalHabits === 0
      ? "warning"
      : summary.weeklyCompletionRate >= 70
      ? "success"
      : summary.weeklyTrend < 0
        ? "warning"
        : "accent";
  const emptyState = summary.totalHabits === 0;
  const heroValue = emptyState
    ? "No habits"
    : `${summary.completedToday}/${summary.totalHabits}`;
  const heroLabel = emptyState ? "to track" : "completed today";
  const highlightText = emptyState
    ? "No habits configured yet"
    : `${summary.weeklyCompletionRate}% weekly completion`;
  const highlightSubtext = emptyState
    ? "Add your first habit to start building streaks"
    : `${streakText} · ${trendLabel}`;

    return (
    <WidgetCard
      title="Habits"
      icon={Target}
      loading={loading}
      href="/admin/habits"
    >
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <WidgetStat value={heroValue} label={heroLabel} />
        <WidgetHighlight
          icon={summary.bestCurrentStreak > 0 ? Flame : TrendingUp}
          text={highlightText}
          subtext={highlightSubtext}
          variant={highlightVariant}
        />
      </motion.div>
    </WidgetCard>
  );
}
