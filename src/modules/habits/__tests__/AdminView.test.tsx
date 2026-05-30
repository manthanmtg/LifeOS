import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HabitsAdminView from "../AdminView";
import HabitsWidget from "../Widget";
import {
  computeMetrics,
  getCompletionRateForDays,
  getStreak,
  heatmapDaysCount,
  getDaysArray,
  getDateStr,
} from "../components/types";
import type { Habit } from "../components/types";
import { buildHeatmapWeeks } from "../components/HabitHeatmap";

// --- Utility function tests ---

describe("getDateStr", () => {
  it("returns YYYY-MM-DD format", () => {
    const d = new Date("2025-06-15T12:00:00Z");
    expect(getDateStr(d)).toBe("2025-06-15");
  });
});

describe("getDaysArray", () => {
  it("returns the correct number of days", () => {
    const days = getDaysArray(7);
    expect(days).toHaveLength(7);
  });

  it("last element is today", () => {
    const days = getDaysArray(7);
    const today = getDateStr(new Date());
    expect(days[days.length - 1]).toBe(today);
  });

  it("days are in ascending order", () => {
    const days = getDaysArray(10);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });
});

describe("heatmapDaysCount", () => {
  it("returns approximately 3 months of days", () => {
    expect(heatmapDaysCount(3)).toBe(92);
  });

  it("returns approximately 6 months of days", () => {
    expect(heatmapDaysCount(6)).toBe(182);
  });

  it("returns approximately 12 months of days", () => {
    expect(heatmapDaysCount(12)).toBe(362);
  });
});

describe("buildHeatmapWeeks", () => {
  it("aligns the first column to a Monday week start", () => {
    const weeks = buildHeatmapWeeks(["2026-04-22", "2026-04-23"], true);
    expect(weeks[0]).toEqual([
      null,
      null,
      "2026-04-22",
      "2026-04-23",
      null,
      null,
      null,
    ]);
  });

  it("aligns the first column to a Sunday week start", () => {
    const weeks = buildHeatmapWeeks(["2026-04-22", "2026-04-23"], false);
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      "2026-04-22",
      "2026-04-23",
      null,
      null,
    ]);
  });
});

describe("getStreak", () => {
  it("returns zero streak for empty completions", () => {
    const result = getStreak([]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it("calculates longest streak correctly", () => {
    // Build a 3-day streak in the past (not touching today)
    const result = getStreak([
      { date: "2020-01-01", count: 1 },
      { date: "2020-01-02", count: 1 },
      { date: "2020-01-03", count: 1 },
    ]);
    expect(result.longest).toBe(3);
    // current streak = 0 since these dates are far in the past
    expect(result.current).toBe(0);
  });

  it("ignores completions with count 0", () => {
    const result = getStreak([
      { date: "2020-01-01", count: 0 },
      { date: "2020-01-02", count: 0 },
    ]);
    expect(result.longest).toBe(0);
    expect(result.current).toBe(0);
  });

  it("counts today in current streak", () => {
    const today = getDateStr(new Date());
    const yesterday = getDateStr(new Date(Date.now() - 86400000));
    const result = getStreak([
      { date: yesterday, count: 1 },
      { date: today, count: 1 },
    ]);
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });
});

describe("getCompletionRateForDays", () => {
  it("calculates the completed percentage across supplied days", () => {
    const rate = getCompletionRateForDays(
      [
        { date: "2026-05-18", count: 1 },
        { date: "2026-05-19", count: 0 },
        { date: "2026-05-20", count: 2 },
      ],
      1,
      ["2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21"],
    );

    expect(rate).toBe(50);
  });
});

describe("computeMetrics", () => {
  it("returns zeros for empty habits array", () => {
    const metrics = computeMetrics([]);
    expect(metrics.totalHabits).toBe(0);
    expect(metrics.completedToday).toBe(0);
    expect(metrics.bestCurrentStreak).toBe(0);
    expect(metrics.weeklyCompletionRate).toBe(0);
    expect(metrics.weeklyTrend).toBe(0);
    expect(metrics.last7Days).toHaveLength(7);
  });

  it("counts total habits correctly", () => {
    const habits: Habit[] = [
      {
        _id: "1",
        payload: {
          name: "A",
          frequency: "daily",
          target_count: 1,
          color: "#10b981",
          completions: [],
        },
      },
      {
        _id: "2",
        payload: {
          name: "B",
          frequency: "daily",
          target_count: 1,
          color: "#3b82f6",
          completions: [],
        },
      },
    ];
    const metrics = computeMetrics(habits);
    expect(metrics.totalHabits).toBe(2);
  });

  it("counts completedToday correctly", () => {
    const today = getDateStr(new Date());
    const habits: Habit[] = [
      {
        _id: "1",
        payload: {
          name: "A",
          frequency: "daily",
          target_count: 1,
          color: "#10b981",
          completions: [{ date: today, count: 1 }],
        },
      },
      {
        _id: "2",
        payload: {
          name: "B",
          frequency: "daily",
          target_count: 1,
          color: "#3b82f6",
          completions: [],
        },
      },
    ];
    const metrics = computeMetrics(habits);
    expect(metrics.completedToday).toBe(1);
  });

  it("last7Days has 7 entries each between 0 and 100", () => {
    const habits: Habit[] = [
      {
        _id: "1",
        payload: {
          name: "A",
          frequency: "daily",
          target_count: 1,
          color: "#10b981",
          completions: [],
        },
      },
    ];
    const metrics = computeMetrics(habits);
    expect(metrics.last7Days).toHaveLength(7);
    for (const v of metrics.last7Days) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

// --- Component tests ---

describe("HabitsAdminView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/system") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: {} }),
        });
      }
      if (url.includes("/api/content")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders the Habits view heading", async () => {
    render(<HabitsAdminView />);
    await waitFor(
      () => {
        expect(screen.queryByText(/Loading/i)).toBeNull();
      },
      { timeout: 2000 },
    );
    expect(screen.getByText(/Habit Tracker/i)).toBeDefined();
  });

  it("shows empty state when no habits", async () => {
    render(<HabitsAdminView />);
    await waitFor(
      () => expect(screen.queryByText(/No habits yet/i)).toBeDefined(),
      { timeout: 2000 },
    );
  });

  it("shows New Habit button", async () => {
    render(<HabitsAdminView />);
    await waitFor(() => expect(screen.getByText(/New Habit/i)).toBeDefined());
  });

  it("opens form when New Habit is clicked", async () => {
    render(<HabitsAdminView />);
    await waitFor(() => expect(screen.getByText(/New Habit/i)).toBeDefined());
    fireEvent.click(screen.getByText(/New Habit/i));
    await waitFor(() =>
      expect(screen.getByLabelText(/habit-name|Name/i)).toBeDefined(),
    );
  });
});

describe("HabitsWidget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    );
  });

  it("renders the widget", async () => {
    render(<HabitsWidget />);
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull(), {
      timeout: 2000,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/widgets/summary?module_type=habit",
      expect.any(Object),
    );
  });
});
