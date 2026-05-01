/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "../route";
import { getDb } from "@/lib/mongodb";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/content/507f1f77bcf86cd799439011", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/content/[id] route", () => {
  let mockUpdateOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439011",
          module_type: "blog_post",
          is_public: false,
          payload: {},
        }),
        updateOne: mockUpdateOne,
      }),
    } as any);
  });

  it("rejects non-boolean public visibility before updating content", async () => {
    const response = await PUT(createJsonRequest({ is_public: "true" }), {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "is_public must be a boolean",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});
