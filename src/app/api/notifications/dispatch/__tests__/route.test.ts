/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

const mocks = vi.hoisted(() => ({
  runNotificationDispatch: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  runNotificationDispatch: mocks.runNotificationDispatch,
}));

describe("POST /api/notifications/dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    mocks.runNotificationDispatch.mockResolvedValue({
      sources_scanned: 1,
      candidates_discovered: 1,
      deliveries_created: 1,
      deliveries_deduplicated: 0,
      deliveries_sent: 1,
      deliveries_failed: 0,
      deliveries_dead_lettered: 0,
      items_skipped: 0,
    });
  });

  it("delegates to the shared dispatcher", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deliveries_sent).toBe(1);
    expect(mocks.runNotificationDispatch).toHaveBeenCalledWith({
      batchSize: 10,
    });
  });
});
