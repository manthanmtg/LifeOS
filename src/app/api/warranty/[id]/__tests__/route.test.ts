/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { PATCH } from "../route";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const id = "507f1f77bcf86cd799439011";

describe("PATCH /api/warranty/[id]", () => {
  const findOneAndUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    findOneAndUpdate.mockResolvedValue({
      _id: id,
      module_type: "warranty_item",
      is_public: false,
      payload: { name: "Kitchen mixer", revision: 2, archived: true },
    });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOneAndUpdate }),
    } as any);
  });

  it("archives an item only when the caller holds its current revision", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/warranty/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision: 1, archived: true }),
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.anything(),
        module_type: "warranty_item",
        "payload.revision": 1,
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          "payload.archived": true,
          "payload.revision": 2,
        }),
      }),
      expect.objectContaining({ returnDocument: "after" }),
    );
  });
});
