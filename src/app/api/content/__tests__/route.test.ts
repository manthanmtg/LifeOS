/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/content route", () => {
  let mockCollection: any;
  let mockDb: any;
  let mockFindChain: any;
  let mockInsertOne: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T12:00:00.000Z"));
    vi.clearAllMocks();

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);

    mockFindChain = {
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };
    mockInsertOne = vi.fn().mockResolvedValue({ insertedId: "content-id" });
    mockCollection = {
      find: vi.fn().mockReturnValue(mockFindChain),
      insertOne: mockInsertOne,
    };
    mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("forces public-only content for unauthenticated requests", async () => {
      const request = new Request(
        "http://localhost/api/content?module_type=blog_post&is_public=false",
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDb.collection).toHaveBeenCalledWith("content");
      expect(mockCollection.find).toHaveBeenCalledWith({
        module_type: "blog_post",
        is_public: true,
      });
      expect(mockFindChain.sort).toHaveBeenCalledWith({ created_at: -1 });
    });

    it("lets authenticated admins filter private content", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "valid-token" }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({ userId: "admin" } as any);

      const request = new Request(
        "http://localhost/api/content?module_type=blog_post&is_public=false",
      );

      await GET(request);

      expect(verifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockCollection.find).toHaveBeenCalledWith({
        module_type: "blog_post",
        is_public: false,
      });
    });

    it("returns a 500 response when fetching content fails", async () => {
      vi.mocked(getDb).mockRejectedValue(new Error("db unavailable"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await GET(new Request("http://localhost/api/content"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: "Failed to fetch content",
      });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("creates validated content with timestamps and default private visibility", async () => {
      const request = createJsonRequest({
        module_type: "blog_post",
        payload: {
          title: "A useful post",
          slug: "a-useful-post",
          content: "Body",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockInsertOne).toHaveBeenCalledWith({
        module_type: "blog_post",
        is_public: false,
        created_at: "2026-04-23T12:00:00.000Z",
        updated_at: "2026-04-23T12:00:00.000Z",
        payload: {
          title: "A useful post",
          slug: "a-useful-post",
          content: "Body",
          status: "draft",
          tags: [],
        },
      });
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: {
          _id: "content-id",
          insertedId: "content-id",
          is_public: false,
        },
      });
    });

    it("preserves explicit public visibility for valid content", async () => {
      const request = createJsonRequest({
        module_type: "blog_post",
        is_public: true,
        payload: {
          title: "Published post",
          slug: "published-post",
          content: "Body",
          status: "published",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockInsertOne.mock.calls[0][0].is_public).toBe(true);
      expect(mockInsertOne.mock.calls[0][0].payload.status).toBe("published");
    });

    it("rejects non-boolean public visibility before touching the database", async () => {
      const response = await POST(
        createJsonRequest({
          module_type: "blog_post",
          is_public: "true",
          payload: {
            title: "Published post",
            slug: "published-post",
            content: "Body",
          },
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: "is_public must be a boolean",
      });
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    it("rejects missing module type before touching the database", async () => {
      const response = await POST(
        createJsonRequest({ payload: { title: "Missing module" } }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: "module_type is required",
      });
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    it("rejects unknown module types before touching the database", async () => {
      const response = await POST(
        createJsonRequest({ module_type: "unknown", payload: {} }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: "Unknown module_type",
      });
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    it.each(["expense_space", "expense_space_entry"])(
      "rejects domain-managed %s creation through generic content",
      async (moduleType) => {
        const response = await POST(
          createJsonRequest({ module_type: moduleType, payload: {} }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
          success: false,
          error: expect.stringMatching(/dedicated expense-spaces API/i),
        });
        expect(mockInsertOne).not.toHaveBeenCalled();
      },
    );

    it("returns validation errors for invalid payloads", async () => {
      const response = await POST(
        createJsonRequest({
          module_type: "blog_post",
          payload: {
            title: "No",
            slug: "Not URL Friendly",
            content: "",
          },
        }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.details).toMatchObject({
        title: { _errors: expect.any(Array) },
        slug: { _errors: expect.any(Array) },
        content: { _errors: expect.any(Array) },
      });
      expect(mockInsertOne).not.toHaveBeenCalled();
    });
  });
});
