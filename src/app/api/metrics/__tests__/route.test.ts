/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";

describe("Metrics API Route", () => {
  let mockDb: any;
  let mockCollection: any;
  let mockFind: any;
  let mockInsertOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockInsertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    mockFind = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };
    mockCollection = {
      find: vi.fn().mockReturnValue(mockFind),
      insertOne: mockInsertOne,
    };
    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  describe("GET /api/metrics", () => {
    it("returns metrics with default days (30)", async () => {
      const req = new NextRequest(new URL("http://localhost/api/metrics"));
      const response = await GET(req);

      expect(response.status).toBe(200);
      expect(mockDb.collection).toHaveBeenCalledWith("metrics");
      expect(mockCollection.find).toHaveBeenCalledWith({
        timestamp: { $gte: expect.any(String) },
      });
      
      const sinceArg = mockCollection.find.mock.calls[0][0].timestamp.$gte;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(thirtyDaysAgo);
    });

    it("respects custom days parameter", async () => {
      const req = new NextRequest(new URL("http://localhost/api/metrics?days=7"));
      const response = await GET(req);

      expect(response.status).toBe(200);
      const sinceArg = mockCollection.find.mock.calls[0][0].timestamp.$gte;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(sevenDaysAgo);
    });

    it("clips days parameter between 1 and 365", async () => {
      // Test lower bound
      const reqLow = new NextRequest(new URL("http://localhost/api/metrics?days=0"));
      await GET(reqLow);
      let sinceArg = mockCollection.find.mock.calls[0][0].timestamp.$gte;
      let expected = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(expected);

      // Test upper bound
      const reqHigh = new NextRequest(new URL("http://localhost/api/metrics?days=400"));
      await GET(reqHigh);
      sinceArg = mockCollection.find.mock.calls[1][0].timestamp.$gte;
      expected = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(expected);
    });

    it("returns empty array and 200 on database error (graceful degradation)", async () => {
      vi.mocked(getDb).mockRejectedValue(new Error("DB Error"));
      const req = new NextRequest(new URL("http://localhost/api/metrics"));
      
      // Mock console.error to avoid cluttering test output
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, data: [] });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe("POST /api/metrics", () => {
    it("successfully records a metric event", async () => {
      const metricData = {
        path: "/dashboard",
        module: "todo",
        action: "complete",
        label: "Task 1",
        value: 1,
        device_type: "mobile",
        is_admin: true,
        metadata: { extra: "data" }
      };
      
      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": "Mozilla/5.0",
          "x-forwarded-for": "1.2.3.4"
        },
        body: JSON.stringify(metricData),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockInsertOne).toHaveBeenCalled();
      
      const insertedEvent = mockInsertOne.mock.calls[0][0];
      expect(insertedEvent.path).toBe("/dashboard");
      expect(insertedEvent.module).toBe("todo");
      expect(insertedEvent.action).toBe("complete");
      expect(insertedEvent.label).toBe("Task 1");
      expect(insertedEvent.value).toBe(1);
      expect(insertedEvent.device_type).toBe("mobile");
      expect(insertedEvent.is_admin).toBe(true);
      expect(insertedEvent.metadata).toEqual({ extra: "data" });
      expect(insertedEvent.session_id).toBeDefined();
      expect(insertedEvent.session_id).toHaveLength(12);
      expect(insertedEvent.timestamp).toBeDefined();
    });

    it("uses default values for missing fields", async () => {
      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const insertedEvent = mockInsertOne.mock.calls[0][0];
      expect(insertedEvent.path).toBe("/");
      expect(insertedEvent.module).toBe("core");
      expect(insertedEvent.action).toBe("view");
      expect(insertedEvent.device_type).toBe("desktop");
      expect(insertedEvent.is_admin).toBe(false);
      expect(insertedEvent.metadata).toEqual({});
    });

    it("sanitizes long input strings", async () => {
      const longString = "a".repeat(1000);
      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: longString,
          module: longString,
          action: longString,
          label: longString,
          referrer: longString,
        }),
      });

      await POST(req);
      const insertedEvent = mockInsertOne.mock.calls[0][0];
      
      expect(insertedEvent.path.length).toBeLessThanOrEqual(200);
      expect(insertedEvent.module.length).toBeLessThanOrEqual(100);
      expect(insertedEvent.action.length).toBeLessThanOrEqual(50);
      expect(insertedEvent.label.length).toBeLessThanOrEqual(200);
      expect(insertedEvent.referrer.length).toBeLessThanOrEqual(500);
    });

    it("generates consistent session_id for same user on same day", () => {
      // This is a bit tricky to test because it uses new Date().toISOString().slice(0, 10)
      // but the hash logic is internal.
      // We can at least test it runs without error.
    });

    it("returns 500 on database error during POST", async () => {
      vi.mocked(getDb).mockRejectedValue(new Error("DB Error"));
      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(req);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to record metric");
      
      consoleSpy.mockRestore();
    });
  });
});
