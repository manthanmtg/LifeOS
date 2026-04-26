/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

function createRequest(body: unknown) {
  return new Request("http://localhost/api/ai-usage/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/ai-usage/sync", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("masks internal errors during sync", async () => {
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { _id: "123", name: "OpenAI", provider: "openai", admin_api_key: "key", is_active: true }
          ])
        })
      })
    } as any);

    // Mock fetch to fail with sensitive info
    global.fetch = vi.fn().mockRejectedValue(new Error("Sensitive internal error"));

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.results[0].status).toBe("error");
    expect(body.data.results[0].error).toBe("Sync failed");
  });

  it("masks top-level catch block errors", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("DB Connection string leaked"));

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Sync failed");
  });
});
