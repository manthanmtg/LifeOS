/** @vitest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocking mongodb before importing the module under test
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

describe("metrics-cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should fetch and format metrics correctly when cache is empty", async () => {
    const { getTieredVisits } = await import("../metrics-cache");
    const { getDb } = await import("@/lib/mongodb");

    const mockAggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: { module: "todo", is_admin: true },
          tier1Count: 10,
          tier2Count: 5,
          tier3Count: 2,
          tier4Count: 1,
        },
        {
          _id: { module: "todo", is_admin: false },
          tier1Count: 100,
          tier2Count: 50,
          tier3Count: 20,
          tier4Count: 10,
        },
      ]),
    });

    const mockDb = {
      collection: vi.fn().mockReturnValue({
        aggregate: mockAggregate,
      }),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await getTieredVisits();

    expect(result).toEqual({
      todo: {
        admin: [10, 5, 2, 1],
        public: [100, 50, 20, 10],
      },
    });

    expect(mockDb.collection).toHaveBeenCalledWith("metrics");
    expect(mockAggregate).toHaveBeenCalled();
  });

  it("should use cache on subsequent calls within duration", async () => {
    const { getTieredVisits } = await import("../metrics-cache");
    const { getDb } = await import("@/lib/mongodb");

    const mockAggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: { module: "todo", is_admin: true },
          tier1Count: 1,
          tier2Count: 1,
          tier3Count: 1,
          tier4Count: 1,
        },
      ]),
    });

    const mockDb = {
      collection: vi.fn().mockReturnValue({
        aggregate: mockAggregate,
      }),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // First call - should hit DB
    await getTieredVisits();
    expect(mockAggregate).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result = await getTieredVisits();
    expect(mockAggregate).toHaveBeenCalledTimes(1);
    expect(result.todo.admin).toEqual([1, 1, 1, 1]);
  });

  it("should handle DB errors and return empty object if no cache", async () => {
    const { getTieredVisits } = await import("../metrics-cache");
    const { getDb } = await import("@/lib/mongodb");

    vi.mocked(getDb).mockRejectedValue(new Error("DB Connection Failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getTieredVisits();
    expect(result).toEqual({});
    consoleSpy.mockRestore();
  });

  it("should return stale cache if DB error occurs after initial fetch", async () => {
    const { getTieredVisits } = await import("../metrics-cache");
    const { getDb } = await import("@/lib/mongodb");

    const mockAggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: { module: "habits", is_admin: true },
          tier1Count: 5,
          tier2Count: 5,
          tier3Count: 5,
          tier4Count: 5,
        },
      ]),
    });

    const mockDb = {
      collection: vi.fn().mockReturnValue({
        aggregate: mockAggregate,
      }),
    };

    vi.mocked(getDb).mockResolvedValueOnce(mockDb as any);

    // First call - success
    await getTieredVisits();

    // Force cache expiry by mocking Date.now
    const now = Date.now();
    const sixMinutesLater = now + 6 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(sixMinutesLater);

    // Second call - DB error
    vi.mocked(getDb).mockRejectedValueOnce(new Error("DB Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getTieredVisits();

    // Should return stale cache instead of empty object
    expect(result.habits.admin).toEqual([5, 5, 5, 5]);

    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("should ignore results with missing module name", async () => {
    const { getTieredVisits } = await import("../metrics-cache");
    const { getDb } = await import("@/lib/mongodb");

    const mockAggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: { module: null, is_admin: true },
          tier1Count: 10,
        },
        {
          _id: { module: "valid", is_admin: true },
          tier1Count: 20,
        },
      ]),
    });

    const mockDb = {
      collection: vi.fn().mockReturnValue({
        aggregate: mockAggregate,
      }),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await getTieredVisits();

    expect(result).toHaveProperty("valid");
    expect(result).not.toHaveProperty("null");
    expect(Object.keys(result)).toHaveLength(1);
  });
});
