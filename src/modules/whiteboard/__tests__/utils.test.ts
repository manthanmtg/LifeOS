import { describe, expect, it } from "vitest";
import { formatDateTime, relativeTime } from "../utils";

describe("whiteboard utils", () => {
  const baseNow = Date.parse("2026-01-02T12:00:00.000Z");

  it("returns just now for timestamps less than one minute old", () => {
    expect(relativeTime("2026-01-02T11:59:40.000Z", baseNow)).toBe("just now");
  });

  it("returns minutes for recent entries", () => {
    expect(relativeTime("2026-01-02T11:52:00.000Z", baseNow)).toBe("8m ago");
    expect(relativeTime("2026-01-02T11:00:00.000Z", baseNow)).toBe("1h ago");
  });

  it("returns hours for entries older than one hour", () => {
    expect(relativeTime("2026-01-02T09:59:00.000Z", baseNow)).toBe("2h ago");
    expect(relativeTime("2026-01-01T13:00:00.000Z", baseNow)).toBe("23h ago");
  });

  it("returns days for entries older than 24 hours", () => {
    expect(relativeTime("2026-01-01T12:00:00.000Z", baseNow)).toBe("1d ago");
    expect(relativeTime("2025-12-04T12:00:00.000Z", baseNow)).toBe("29d ago");
  });

  it("falls back to locale date for entries older than 30 days", () => {
    expect(relativeTime("2025-11-01T12:00:00.000Z", baseNow)).toBe(
      new Date("2025-11-01T12:00:00.000Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );
  });

  it("returns just now for future timestamps", () => {
    expect(relativeTime("2026-01-02T12:05:00.000Z", baseNow)).toBe("just now");
  });

  it("formats dates with locale formatting", () => {
    expect(formatDateTime("2026-01-02T12:00:00.000Z")).toBe(
      new Date("2026-01-02T12:00:00.000Z").toLocaleString(),
    );
  });

  it("keeps invalid datetime strings stable", () => {
    expect(formatDateTime("not-a-date")).toBe("Invalid Date");
  });
});
