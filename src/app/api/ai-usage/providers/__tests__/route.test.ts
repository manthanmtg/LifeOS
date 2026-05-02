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
  return new Request("http://localhost/api/ai-usage/providers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validProvider(overrides: Record<string, unknown> = {}) {
  return {
    name: "OpenAI Admin",
    provider: "openai",
    admin_api_key: "sk-admin-secret-1234",
    monthly_budget: 25,
    organization_name: "LifeOS",
    is_active: true,
    ...overrides,
  };
}

describe("/api/ai-usage/providers", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:30:00.000Z"));
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  it("rejects unauthenticated GET requests before database access", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(verifyToken).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns providers with admin API keys masked", async () => {
    const toArray = vi.fn().mockResolvedValue([
      {
        _id: "provider-1",
        name: "OpenAI",
        provider: "openai",
        admin_api_key: "sk-admin-secret-1234",
        created_at: "2026-01-14T00:00:00.000Z",
      },
      {
        _id: "provider-2",
        name: "Anthropic",
        provider: "anthropic",
        admin_api_key: "tiny",
        created_at: "2026-01-13T00:00:00.000Z",
      },
    ]);
    const sort = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue({ sort });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ find }),
    } as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(find).toHaveBeenCalledWith();
    expect(sort).toHaveBeenCalledWith({ created_at: -1 });
    expect(body.data).toMatchObject([
      { _id: "provider-1", admin_api_key: "sk-admi...1234" },
      { _id: "provider-2", admin_api_key: "****tiny" },
    ]);
  });

  it("masks GET failures behind a generic error", async () => {
    vi.mocked(getDb).mockRejectedValue(
      new Error("mongodb://admin:secret@internal-host"),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch providers");
    expect(console.error).toHaveBeenCalledWith(
      "GET /api/ai-usage/providers failed:",
      expect.any(Error),
    );
  });

  it("rejects malformed POST payloads before database access", async () => {
    const response = await POST(
      createRequest({
        name: "",
        provider: "unsupported",
        admin_api_key: "",
        monthly_budget: -1,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details).toMatchObject({
      name: { _errors: ["Name is required"] },
      provider: { _errors: expect.any(Array) },
      admin_api_key: { _errors: ["Admin API key is required"] },
      monthly_budget: { _errors: expect.any(Array) },
    });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("creates a provider with managed timestamps and a masked API key", async () => {
    const insertOne = vi.fn().mockResolvedValue({ insertedId: "new-provider" });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ insertOne }),
    } as any);

    const response = await POST(createRequest(validProvider()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(insertOne).toHaveBeenCalledWith({
      ...validProvider(),
      created_at: "2026-01-15T12:30:00.000Z",
      updated_at: "2026-01-15T12:30:00.000Z",
    });
    expect(body.data).toMatchObject({
      _id: "new-provider",
      created_at: "2026-01-15T12:30:00.000Z",
      updated_at: "2026-01-15T12:30:00.000Z",
      admin_api_key: "sk-admi...1234",
    });
  });

  it("masks POST failures behind a generic error", async () => {
    vi.mocked(getDb).mockRejectedValue(
      new Error("insert failed with sk-admin-secret-1234"),
    );

    const response = await POST(createRequest(validProvider()));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to create provider");
    expect(console.error).toHaveBeenCalledWith(
      "POST /api/ai-usage/providers failed:",
      expect.any(Error),
    );
  });
});
