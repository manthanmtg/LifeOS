/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { DELETE, GET } from "../route";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const id = "507f1f77bcf86cd799439011";
const documentId = "507f1f77bcf86cd799439012";

describe("GET /api/warranty/[id]/documents/[documentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        _id: id,
        module_type: "warranty_item",
        payload: { warranty_key: "11111111-1111-4111-8111-111111111111" },
      })
      .mockResolvedValueOnce({
        _id: documentId,
        module_type: "warranty_document",
        payload: {
          warranty_key: "11111111-1111-4111-8111-111111111111",
          filename: "manual.txt",
          content_type: "text/plain",
          data: Buffer.from("manual").toString("base64"),
          size: 6,
        },
      });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne }),
    } as any);
  });

  it("downloads arbitrary file types as an attachment instead of attempting an unsafe preview", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/warranty/${id}/documents/${documentId}`,
      ),
      { params: Promise.resolve({ id, documentId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream",
    );
    expect(response.headers.get("content-disposition")).toContain("manual.txt");
    await expect(response.text()).resolves.toBe("manual");
  });

  it("deletes only a document that belongs to the selected warranty item", async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        _id: id,
        module_type: "warranty_item",
        payload: {
          warranty_key: "11111111-1111-4111-8111-111111111111",
          archived: false,
        },
      })
      .mockResolvedValueOnce({
        _id: documentId,
        module_type: "warranty_document",
        payload: { warranty_key: "11111111-1111-4111-8111-111111111111" },
      });
    const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne, deleteOne }),
    } as any);

    const response = await DELETE(
      new Request(
        `http://localhost/api/warranty/${id}/documents/${documentId}`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id, documentId }) },
    );

    expect(response.status).toBe(200);
    expect(deleteOne).toHaveBeenCalledWith({
      _id: expect.anything(),
      module_type: "warranty_document",
      "payload.warranty_key": "11111111-1111-4111-8111-111111111111",
    });
  });
});
