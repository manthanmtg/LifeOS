/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import { DELETE, GET, PUT } from "../route";
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

const providerId = new ObjectId("64f0c8f8f8f8f8f8f8f8f8f8");

function params(id = providerId.toHexString()) {
  return { params: Promise.resolve({ id }) };
}

function updateRequest(body: unknown) {
  return new Request(`http://localhost/api/ai-usage/providers/${providerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function provider(overrides: Record<string, unknown> = {}) {
  return {
    _id: providerId,
    name: "OpenAI Admin",
    provider: "openai",
    admin_api_key: "sk-admin-secret-1234",
    monthly_budget: 25,
    organization_name: "LifeOS",
    is_active: true,
    created_at: "2026-01-14T00:00:00.000Z",
    updated_at: "2026-01-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("/api/ai-usage/providers/[id]", () => {
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

  it("rejects unauthenticated GET requests before validating IDs or accessing the database", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const response = await GET(new Request("http://localhost"), params("bad"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(verifyToken).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid IDs before database access", async () => {
    const response = await GET(new Request("http://localhost"), params("bad"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns not found when the provider does not exist", async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne }),
    } as any);

    const response = await GET(new Request("http://localhost"), params());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
    expect(findOne).toHaveBeenCalledWith({ _id: providerId });
  });

  it("returns a provider with the admin API key masked", async () => {
    const findOne = vi.fn().mockResolvedValue(provider());
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne }),
    } as any);

    const response = await GET(new Request("http://localhost"), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      _id: providerId.toHexString(),
      admin_api_key: "sk-admi...1234",
    });
  });

  it("keeps the existing API key when PUT receives a masked key", async () => {
    const findOne = vi.fn().mockResolvedValue(provider());
    const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne, updateOne }),
    } as any);

    const response = await PUT(
      updateRequest({
        name: "Updated OpenAI",
        admin_api_key: "sk-admi...1234",
        monthly_budget: 40,
      }),
      params(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: providerId },
      {
        $set: {
          name: "Updated OpenAI",
          monthly_budget: 40,
          updated_at: "2026-01-15T12:30:00.000Z",
        },
      },
    );
  });

  it("rejects invalid merged PUT payloads without updating the provider", async () => {
    const findOne = vi.fn().mockResolvedValue(provider());
    const updateOne = vi.fn();
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne, updateOne }),
    } as any);

    const response = await PUT(updateRequest({ name: "" }), params());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details).toMatchObject({
      name: { _errors: ["Name is required"] },
    });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("deletes the provider and synced usage entries for that provider", async () => {
    const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const deleteMany = vi.fn().mockResolvedValue({ deletedCount: 2 });
    const collection = vi.fn((name: string) => {
      if (name === "ai_providers") return { deleteOne };
      return { deleteMany };
    });
    vi.mocked(getDb).mockResolvedValue({ collection } as any);

    const response = await DELETE(new Request("http://localhost"), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(deleteOne).toHaveBeenCalledWith({ _id: providerId });
    expect(deleteMany).toHaveBeenCalledWith({
      module_type: "ai_usage",
      "payload.provider_config_id": providerId.toHexString(),
      "payload.synced": true,
    });
  });

  it("masks database failures behind a generic GET error", async () => {
    vi.mocked(getDb).mockRejectedValue(
      new Error("mongodb://admin:secret@internal-host"),
    );

    const response = await GET(new Request("http://localhost"), params());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch provider");
    expect(console.error).toHaveBeenCalledWith(
      "GET /api/ai-usage/providers/[id] failed:",
      expect.any(Error),
    );
  });
});
