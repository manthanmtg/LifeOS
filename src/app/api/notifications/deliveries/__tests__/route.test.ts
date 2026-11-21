/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getRecentNotificationDeliveries: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/notifications/repositories", () => ({
  getRecentNotificationDeliveries: mocks.getRecentNotificationDeliveries,
}));

function request(query: string = "") {
  return new Request(
    `http://localhost/api/notifications/deliveries${query}`,
    { method: "GET" },
  );
}

describe("GET /api/notifications/deliveries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    mocks.getDb.mockResolvedValue({} as any);
    mocks.getRecentNotificationDeliveries.mockResolvedValue([
      { id: "d1", status: "sent" },
      { id: "d2", status: "failed" },
    ]);
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.getRecentNotificationDeliveries).not.toHaveBeenCalled();
  });

  it("rejects requests without a session cookie", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(mocks.getRecentNotificationDeliveries).not.toHaveBeenCalled();
  });

  it("returns deliveries with the default limit", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(mocks.getRecentNotificationDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      20,
    );
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: [
        { id: "d1", status: "sent" },
        { id: "d2", status: "failed" },
      ],
    });
  });

  it("passes a valid custom limit through", async () => {
    await GET(request("?limit=42"));

    expect(mocks.getRecentNotificationDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      42,
    );
  });

  it("clamps the limit above 100 down to 100", async () => {
    await GET(request("?limit=500"));

    expect(mocks.getRecentNotificationDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      100,
    );
  });

  it("clamps the limit below 1 up to 1", async () => {
    await GET(request("?limit=0"));

    expect(mocks.getRecentNotificationDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      1,
    );
  });

  it("truncates fractional limits", async () => {
    await GET(request("?limit=7.9"));

    expect(mocks.getRecentNotificationDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      7,
    );
  });

  it("falls back to the default limit for non-numeric input", async () => {
    await GET(request("?limit=abc"));

    expect(mocks.getRecentNotificationDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      20,
    );
  });

  it("returns an error response when loading deliveries fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getRecentNotificationDeliveries.mockRejectedValue(
      new Error("db unavailable"),
    );

    const response = await GET(request());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: "Failed to load notification deliveries",
    });
    consoleError.mockRestore();
  });

  it("returns an error response when the database is unavailable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getDb.mockRejectedValue(new Error("connection failed"));

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(mocks.getRecentNotificationDeliveries).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
