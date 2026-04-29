import { describe, expect, it, vi } from "vitest";
import { getTodayDateInput } from "../components/helpers";

describe("health helpers", () => {
  it("formats the current day for date inputs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T14:30:00.000Z"));

    expect(getTodayDateInput()).toBe("2026-04-19");

    vi.useRealTimers();
  });
});
