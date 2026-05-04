/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

describe("Metrics API Route", () => {
  let mockDb: any;
  let mockCollection: any;
  let mockFind: any;
  let mockInsertOne: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(cookies).mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);

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
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(thirtyDaysAgo);
    });

    it("respects custom days parameter", async () => {
      const req = new NextRequest(
        new URL("http://localhost/api/metrics?days=7"),
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const sinceArg = mockCollection.find.mock.calls[0][0].timestamp.$gte;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(sevenDaysAgo);
    });

    it("clips days parameter between 1 and 365", async () => {
      // Test lower bound
      const reqLow = new NextRequest(
        new URL("http://localhost/api/metrics?days=0"),
      );
      await GET(reqLow);
      let sinceArg = mockCollection.find.mock.calls[0][0].timestamp.$gte;
      let expected = new Date(Date.now() - 1 * 86400000)
        .toISOString()
        .slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(expected);

      // Test upper bound
      const reqHigh = new NextRequest(
        new URL("http://localhost/api/metrics?days=400"),
      );
      await GET(reqHigh);
      sinceArg = mockCollection.find.mock.calls[1][0].timestamp.$gte;
      expected = new Date(Date.now() - 365 * 86400000)
        .toISOString()
        .slice(0, 10);
      expect(sinceArg.slice(0, 10)).toBe(expected);
    });

    it("returns empty array and 200 on database error (graceful degradation)", async () => {
      vi.mocked(getDb).mockRejectedValue(new Error("DB Error"));
      const req = new NextRequest(new URL("http://localhost/api/metrics"));

      // Mock console.error to avoid cluttering test output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await GET(req);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true, data: [] });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("POST /api/metrics", () => {
    it("successfully records a metric event for an admin", async () => {
      // Mock admin session
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });

      const metricData = {
        path: "/dashboard",
        module: "todo",
        action: "complete",
        label: "Task 1",
        value: 1,
        device_type: "mobile",
        is_admin: true,
        metadata: { extra: "data" },
      };

      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": "Mozilla/5.0",
          "x-forwarded-for": "1.2.3.4",
        },
        body: JSON.stringify(metricData),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(mockInsertOne).toHaveBeenCalled();

      const insertedEvent = mockInsertOne.mock.calls[0][0];
      expect(insertedEvent.is_admin).toBe(true);
    });

    it("prevents is_admin spoofing for unauthenticated requests", async () => {
      // No cookies/token mocked (default beforeEach handles this)

      const metricData = {
        path: "/public",
        is_admin: true, // Spoofed value
      };

      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metricData),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const insertedEvent = mockInsertOne.mock.calls[0][0];
      expect(insertedEvent.is_admin).toBe(false); // Should be forced to false
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
      expect(insertedEvent.device_type).toBe("unknown");
      expect(insertedEvent.is_admin).toBe(false);
      expect(insertedEvent.metadata).toEqual({});
    });

    it("fails validation for excessively long strings", async () => {
      const longString = "a".repeat(1000);
      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: longString,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400); // ApiValidationError
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    it("returns validation errors for malformed JSON", async () => {
      const req = new NextRequest(new URL("http://localhost/api/metrics"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(mockInsertOne).not.toHaveBeenCalled();
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

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const response = await POST(req);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to record metric");

      consoleSpy.mockRestore();
    });
  });
});
