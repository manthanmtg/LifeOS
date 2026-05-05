/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";

describe("Export API Route", () => {
  let mockDb: any;
  let mockCollections: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T12:00:00Z"));

    mockCollections = {
      system: {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ id: "sys1" }]),
        }),
      },
      content: {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ id: "cnt1" }]),
        }),
      },
      metrics: {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ id: "met1" }]),
        }),
      },
    };

    mockDb = {
      collection: vi.fn((name) => mockCollections[name]),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("GET /api/export", () => {
    it("returns 200 and a full backup JSON with correct data", async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      
      const body = await response.json();
      expect(body.version).toBe("1.0");
      expect(body.exported_at).toBe("2026-05-05T12:00:00.000Z");
      expect(body.data.system).toEqual([{ id: "sys1" }]);
      expect(body.data.content).toEqual([{ id: "cnt1" }]);
      expect(body.data.metrics).toEqual([{ id: "met1" }]);

      expect(mockDb.collection).toHaveBeenCalledWith("system");
      expect(mockDb.collection).toHaveBeenCalledWith("content");
      expect(mockDb.collection).toHaveBeenCalledWith("metrics");
    });

    it("sets the correct Content-Disposition filename based on current date", async () => {
      const response = await GET();
      expect(response.headers.get("Content-Disposition")).toBe(
        "attachment; filename=\"lifeos-backup-2026-05-05.json\""
      );
    });

    it("handles empty collections gracefully", async () => {
      mockCollections.system.find().toArray.mockResolvedValue([]);
      mockCollections.content.find().toArray.mockResolvedValue([]);
      mockCollections.metrics.find().toArray.mockResolvedValue([]);

      const response = await GET();
      const body = await response.json();
      
      expect(body.data.system).toEqual([]);
      expect(body.data.content).toEqual([]);
      expect(body.data.metrics).toEqual([]);
    });

    it("returns 500 when database connection fails", async () => {
      vi.mocked(getDb).mockRejectedValue(new Error("DB Connection Error"));
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const response = await GET();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Export failed");
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it("returns 500 when fetching system collection fails", async () => {
      mockCollections.system.find().toArray.mockRejectedValue(new Error("Fetch Error"));
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await GET();

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("returns 500 when fetching content collection fails", async () => {
      mockCollections.content.find().toArray.mockRejectedValue(new Error("Fetch Error"));
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await GET();

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("returns 500 when fetching metrics collection fails", async () => {
      mockCollections.metrics.find().toArray.mockResolvedValue([]); // system ok
      mockCollections.metrics.find().toArray.mockRejectedValue(new Error("Fetch Error"));
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await GET();

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
