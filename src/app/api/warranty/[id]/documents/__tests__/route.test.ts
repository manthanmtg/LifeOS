/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { POST } from "../route";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const id = "507f1f77bcf86cd799439011";

describe("POST /api/warranty/[id]/documents", () => {
  const findOne = vi.fn();
  const insertOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    findOne.mockResolvedValue({
      _id: id,
      module_type: "warranty_item",
      payload: {
        warranty_key: "11111111-1111-4111-8111-111111111111",
        archived: false,
        coverages: [],
        service_history: [],
      },
    });
    insertOne.mockResolvedValue({ insertedId: "507f1f77bcf86cd799439012" });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne, insertOne }),
    } as any);
  });

  it("stores a directly uploaded document against the item's stable key and omits bytes from the response", async () => {
    const data = Buffer.from("manual").toString("base64");
    const response = await POST(
      new Request(`http://localhost/api/warranty/${id}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: "manual.txt",
          content_type: "text/plain",
          data,
        }),
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(201);
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: "warranty_document",
        is_public: false,
        payload: expect.objectContaining({
          warranty_key: "11111111-1111-4111-8111-111111111111",
          filename: "manual.txt",
          size: 6,
        }),
      }),
    );
    const body = await response.json();
    expect(body).toMatchObject({
      data: { payload: { filename: "manual.txt" } },
    });
    expect(body.data.payload).not.toHaveProperty("data");
  });
});
