/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const spaceId = "507f1f77bcf86cd799439011";
const documentId = "507f1f77bcf86cd799439012";
const params = { params: Promise.resolve({ spaceId, documentId }) };
const parent = {
  _id: spaceId,
  module_type: "expense_space",
  payload: {
    space_key: "11111111-1111-4111-8111-111111111111",
    status: "active",
  },
};
const document = {
  _id: documentId,
  module_type: "expense_space_document",
  is_public: false,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  payload: {
    space_key: parent.payload.space_key,
    filename: "estimate.pdf",
    content_type: "application/pdf",
    size: 10,
    data: "secret",
  },
};

describe("PATCH /api/expense-spaces/[spaceId]/docs/[documentId]", () => {
  let collection: any;

  beforeEach(() => {
    vi.clearAllMocks();
    collection = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(document),
      findOneAndUpdate: vi.fn().mockResolvedValue({
        ...document,
        payload: { ...document.payload, filename: "revised-estimate.pdf" },
      }),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
  });

  it("changes only the stored filename and never returns file bytes", async () => {
    const response = await PATCH(
      new Request(
        `http://localhost/api/expense-spaces/${spaceId}/docs/${documentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ filename: "revised-estimate.pdf" }),
        },
      ),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ module_type: "expense_space_document" }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "payload.filename": "revised-estimate.pdf",
        }),
      }),
      expect.objectContaining({ returnDocument: "after" }),
    );
    expect(body.data.payload).toMatchObject({
      filename: "revised-estimate.pdf",
    });
    expect(body.data.payload.data).toBeUndefined();
  });

  it("rejects extension changes", async () => {
    const response = await PATCH(
      new Request(
        `http://localhost/api/expense-spaces/${spaceId}/docs/${documentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ filename: "revised-estimate.docx" }),
        },
      ),
      params,
    );
    expect(response.status).toBe(400);
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
