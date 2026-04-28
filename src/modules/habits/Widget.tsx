"use client";

import { useState, useEffect } from "react";
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

  return (
    <WidgetCard
      title="Habits"
      icon={Target}
      loading={loading}
      href="/admin/habits"
    >
      <div className="space-y-3">
        <WidgetStat
          value={`${summary.completedToday}/${summary.totalHabits}`}
          label="completed today"
        />
        <WidgetHighlight
          icon={summary.bestCurrentStreak > 0 ? Flame : TrendingUp}
          text={`${summary.weeklyCompletionRate}% weekly completion`}
          subtext={`${streakText} · ${trendLabel}`}
          variant={summary.weeklyCompletionRate >= 70 ? "success" : "accent"}
        />
      </div>
    </WidgetCard>
  );
}
