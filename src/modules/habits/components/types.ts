// --- Habits Module Types & Utilities ---

interface HabitCompletion {
  date: string;
  count: number;
}

interface HabitPayload {
  name: string;
  description?: string;
  frequency: string;
  target_count: number;
  color: string;
  completions: HabitCompletion[];
}

export interface Habit {
  _id: string;
  payload: HabitPayload;
}

export interface HabitSettings {
  defaultFrequency: string;
  defaultTarget: number;
  weekStartMon: boolean;
  heatmapMonths: number;
  [key: string]: unknown;
}

interface StreakInfo {
  current: number;
  longest: number;
}

export interface HabitMetricsData {
  totalHabits: number;
  completedToday: number;
  bestCurrentStreak: number;
  weeklyCompletionRate: number;
  weeklyTrend: number;
  last7Days: number[];
}

export const COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
] as const;

export const HABIT_DEFAULTS: HabitSettings = {
  defaultFrequency: "daily",
  defaultTarget: 1,
  weekStartMon: true,
  heatmapMonths: 6,
};

// --- Utility functions ---

export function getDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function asDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
}

export function getDaysArray(
  count: number,
  endDate: Date | string = new Date(),
): string[] {
  const arr: string[] = [];
  const today = asDate(endDate);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(getDateStr(d));
  }
  return arr;
}

export function getStreak(
  completions: HabitCompletion[],
  targetCount: number = 1,
  today: Date | string = new Date(),
): StreakInfo {
  const dateSet = new Set(
    completions.filter((c) => c.count >= targetCount).map((c) => c.date),
  );
  const currentDay = asDate(today);
  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(currentDay);
    d.setDate(currentDay.getDate() - i);
    if (dateSet.has(getDateStr(d))) current++;
    else break;
  }
  let longest = 0,
    streak = 0;
  const sorted = [...dateSet].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    longest = Math.max(longest, streak);
  }
  return { current, longest };
}

export function getCompletionRateForDays(
  completions: HabitCompletion[],
  targetCount: number = 1,
  days: string[],
): number {
  if (days.length === 0) return 0;

  const completionDates = new Set(
    completions.filter((c) => c.count >= targetCount).map((c) => c.date),
  );
  const completedDays = days.filter((day) => completionDates.has(day)).length;

  return Math.round((completedDays / days.length) * 100);
}

export function computeMetrics(
  habits: Habit[],
  today: Date | string = new Date(),
): HabitMetricsData {
  const todayStr = typeof today === "string" ? today : getDateStr(today);

  let completedToday = 0;
  let bestCurrentStreak = 0;

  // Last 7 days array for sparkline
  const last7DaysArr = getDaysArray(7, today);
  const dailyCompletions = last7DaysArr.map(() => 0);

  // Last 14 days for trend comparison
  const last14DaysArr = getDaysArray(14, today);
  let thisWeekTotal = 0;
  let lastWeekTotal = 0;

  for (const habit of habits) {
    const target = habit.payload.target_count || 1;
    const completionDates = new Set(
      habit.payload.completions.filter((c) => c.count >= target).map((c) => c.date),
    );

    if (completionDates.has(todayStr)) completedToday++;

    const streakInfo = getStreak(habit.payload.completions, target, todayStr);
    if (streakInfo.current > bestCurrentStreak) {
      bestCurrentStreak = streakInfo.current;
    }

    // Count completions per day for sparkline
    for (let i = 0; i < last7DaysArr.length; i++) {
      if (completionDates.has(last7DaysArr[i])) dailyCompletions[i]++;
    }

    // Trend: this week vs last week
    for (let i = 0; i < 14; i++) {
      if (completionDates.has(last14DaysArr[i])) {
        if (i < 7) lastWeekTotal++;
        else thisWeekTotal++;
      }
    }
  }

  const maxPossiblePerDay = habits.length || 1;
  const weeklyCompletionRate =
    habits.length > 0
      ? Math.round(
          (dailyCompletions.reduce((a, b) => a + b, 0) /
            (7 * maxPossiblePerDay)) *
            100,
        )
      : 0;

  const weeklyTrend =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : thisWeekTotal > 0
        ? 100
        : 0;

  // Normalize sparkline: completions as % of total habits per day
  const last7Days = dailyCompletions.map((count) =>
    habits.length > 0 ? Math.round((count / habits.length) * 100) : 0,
  );

  return {
    totalHabits: habits.length,
    completedToday,
    bestCurrentStreak,
    weeklyCompletionRate,
    weeklyTrend,
    last7Days,
  };
}

/** Days count for heatmap based on months setting */
export function heatmapDaysCount(months: number): number {
  return months * 30 + 2; // approximate days + buffer
}
