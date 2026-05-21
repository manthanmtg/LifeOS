import { describe, expect, it } from "vitest";

import {
  formatIdeaTimestamp,
  IDEA_PRIORITY_STYLES,
  IDEA_STATUS_LABELS,
  IDEA_STATUS_STYLES,
} from "../shared";

describe("formatIdeaTimestamp", () => {
  it("returns null for undefined input", () => {
    expect(formatIdeaTimestamp()).toBeNull();
  });

  it("returns null for empty string input", () => {
    expect(formatIdeaTimestamp("")).toBeNull();
  });

  it("returns null for malformed timestamp strings", () => {
    expect(formatIdeaTimestamp("not-a-date")).toBeNull();
  });

  it("formats a valid ISO timestamp consistently", () => {
    const iso = "2026-01-02T03:04:05.000Z";
    const expected = new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    expect(formatIdeaTimestamp(iso)).toBe(expected);
  });

  it("handles leap day timestamps", () => {
    const iso = "2024-02-29T12:34:00.000Z";
    expect(formatIdeaTimestamp(iso)).toBe(
      new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  });

  it("handles midnight timestamps without dropping values", () => {
    const iso = "2026-12-31T00:00:00.000Z";
    expect(formatIdeaTimestamp(iso)).toBe(
      new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  });

  it("handles timezone-extended ISO inputs", () => {
    const iso = "2026-01-02T03:04:05-05:00";
    expect(formatIdeaTimestamp(iso)).toBe(
      new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  });
});

describe("idea status constants", () => {
  it("exposes all status labels", () => {
    expect(IDEA_STATUS_LABELS).toEqual({
      raw: "Raw",
      exploring: "Exploring",
      archived: "Archived",
    });
  });

  it("uses semantic css tokens for status styles", () => {
    expect(IDEA_STATUS_STYLES).toEqual({
      raw: expect.stringContaining("zinc-") || expect.any(String),
      exploring: expect.stringContaining("accent") || expect.any(String),
      archived: expect.stringContaining("zinc-") || expect.any(String),
    });
  });

  it("uses semantic css tokens for priority styles", () => {
    expect(IDEA_PRIORITY_STYLES).toMatchObject({
      high: expect.stringContaining("danger"),
      medium: expect.stringContaining("warning"),
      low: expect.stringContaining("success"),
    });
  });

  it("keeps status and priority maps in sync with expected keys", () => {
    const requiredStatusKeys = ["raw", "exploring", "archived"];
    const requiredPriorityKeys = ["high", "medium", "low"];

    expect(Object.keys(IDEA_STATUS_STYLES).sort()).toEqual(
      requiredStatusKeys.sort(),
    );
    expect(Object.keys(IDEA_PRIORITY_STYLES).sort()).toEqual(
      requiredPriorityKeys.sort(),
    );
  });
});
