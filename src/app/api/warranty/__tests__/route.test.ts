/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { GET, POST } from "../route";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

describe("POST /api/warranty", () => {
  const insertOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    insertOne.mockResolvedValue({ insertedId: "507f1f77bcf86cd799439011" });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ insertOne, find: vi.fn() }),
    } as any);
  });

  it("creates a private name-only warranty item with a server-generated key", async () => {
    const response = await POST(
      new Request("http://localhost/api/warranty", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: { name: "Kitchen mixer" } }),
      }),
    );

    expect(response.status).toBe(201);
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: "warranty_item",
        is_public: false,
        payload: expect.objectContaining({
          name: "Kitchen mixer",
          revision: 1,
          archived: false,
          warranty_key: expect.any(String),
          linked_bills: [],
        }),
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { payload: { name: "Kitchen mixer" } },
    });
  });

  it("lists only active warranty items by default", async () => {
    const toArray = vi.fn().mockResolvedValue([
      {
        _id: "507f1f77bcf86cd799439012",
        module_type: "warranty_item",
        is_public: false,
        payload: { name: "Kitchen mixer", archived: false, coverages: [] },
      },
    ]);
    const find = vi
      .fn()
      .mockReturnValue({ sort: vi.fn().mockReturnValue({ toArray }) });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ find, insertOne }),
    } as any);

    const response = await GET(new Request("http://localhost/api/warranty"));

    expect(response.status).toBe(200);
    expect(find).toHaveBeenCalledWith({
      module_type: "warranty_item",
      "payload.archived": false,
    });
    await expect(response.json()).resolves.toMatchObject({
      data: { total: 1, items: [{ payload: { name: "Kitchen mixer" } }] },
    });
  });
});
