/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
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

describe("POST /api/notifications/encryption-key", () => {
  const originalKey = process.env.NOTIFICATION_ENCRYPTION_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    delete process.env.NOTIFICATION_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NOTIFICATION_ENCRYPTION_KEY;
    } else {
      process.env.NOTIFICATION_ENCRYPTION_KEY = originalKey;
    }
  });

  it("generates and stores a database-backed encryption key", async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const db = {
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ _id: "global" }),
        updateOne,
      }),
    };
    mocks.getDb.mockResolvedValue(db);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      encryption_ready: true,
      generated: true,
      source: "database",
    });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: "global" },
      {
        $set: {
          notificationEncryptionKey: expect.stringMatching(/^[A-Za-z0-9+/=]+$/),
        },
      },
      { upsert: true },
    );
  });
});
