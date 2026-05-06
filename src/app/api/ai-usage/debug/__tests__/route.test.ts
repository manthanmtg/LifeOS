/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "../route";
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
  return new Request("http://localhost/api/ai-usage/debug", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/ai-usage/debug", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).NODE_ENV = "development";
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  it("masks internal errors from GET responses", async () => {
    vi.mocked(getDb).mockRejectedValue(
      new Error("mongodb://user:password@internal-host"),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Debug failed");
    expect(console.error).toHaveBeenCalledWith(
      "GET /api/ai-usage/debug failed:",
      expect.any(Error),
    );
  });

  it("masks internal errors from POST responses", async () => {
    vi.mocked(getDb).mockRejectedValue(
      new Error("mongodb://user:password@internal-host"),
    );

    const response = await POST(createRequest({ provider_id: "bad-id" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Test failed");
    expect(console.error).toHaveBeenCalledWith(
      "POST /api/ai-usage/debug failed:",
      expect.any(Error),
    );
  });

  it("rejects malformed POST payloads before database access", async () => {
    const response = await POST(createRequest({ provider_id: 123 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed POST JSON before database access", async () => {
    const response = await POST(
      new Request("http://localhost/api/ai-usage/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("masks inner errors in POST responses", async () => {
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue({
          _id: "123",
          name: "OpenAI",
          provider: "openai",
          admin_api_key: "key",
        }),
      }),
    } as any);

    // Mock fetch to fail for the inner call
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Sensitive inner error"));

    const response = await POST(
      createRequest({ provider_id: "123456789012345678901234" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.usage.error).toBe("Failed to fetch debug info");
    expect(body.data.cost.error).toBe("Failed to fetch debug info");
  });
});
