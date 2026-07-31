/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUT } from "../route";
import { getDb } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

function request(body: unknown) {
  return new Request("http://localhost/api/notifications/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/notifications/settings", () => {
  let updateOne: ReturnType<typeof vi.fn>;
  let findOne: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    findOne = vi.fn().mockResolvedValue({
      _id: "global",
      notificationSettings: {
        enabled: false,
        timezone: "UTC",
        deliveryHour: 9,
        catchUpHours: 36,
      },
    });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne, updateOne }),
    } as any);
  });

  it("rejects unauthenticated requests inside the route", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);

    const response = await PUT(request({ enabled: true }));

    expect(response.status).toBe(401);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("merges valid settings with defaults before persisting", async () => {
    const response = await PUT(
      request({ enabled: true, timezone: "Asia/Kolkata", deliveryHour: 8 }),
    );

    expect(response.status).toBe(200);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "global" },
      {
        $set: {
          notificationSettings: {
            enabled: true,
            timezone: "Asia/Kolkata",
            deliveryHour: 8,
            catchUpHours: 36,
          },
        },
      },
      { upsert: true },
    );
  });

  it("rejects invalid timezones", async () => {
    const response = await PUT(request({ timezone: "Mars/Base" }));

    expect(response.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });
});
