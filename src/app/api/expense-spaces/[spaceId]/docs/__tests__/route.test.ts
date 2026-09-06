/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const spaceId = "507f1f77bcf86cd799439011";
const params = { params: Promise.resolve({ spaceId }) };
const parent = {
  _id: spaceId,
  module_type: "expense_space",
  payload: {
    space_key: "11111111-1111-4111-8111-111111111111",
    status: "active",
  },
};

function admin() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

describe("/api/expense-spaces/[spaceId]/docs", () => {
  let collection: any;
  let cursor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    cursor = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };
    collection = {
      findOne: vi.fn().mockResolvedValue(parent),
      find: vi.fn().mockReturnValue(cursor),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi
        .fn()
        .mockResolvedValue({ insertedId: "507f1f77bcf86cd799439012" }),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);
  });

  it("returns metadata without base64 data and paginates documents", async () => {
    admin();
    collection.countDocuments.mockResolvedValue(1);
    cursor.toArray.mockResolvedValue([
      {
        _id: "doc-id",
        module_type: "expense_space_document",
        payload: { filename: "tax.xlsx", data: "secret" },
      },
    ]);
    const response = await GET(
      new Request(
        `http://localhost/api/expense-spaces/${spaceId}/docs?page=1&page_size=25&search=tax`,
      ),
      params,
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(collection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: "expense_space_document",
        "payload.space_key": parent.payload.space_key,
        "payload.filename": expect.any(Object),
      }),
      expect.objectContaining({ projection: expect.any(Object) }),
    );
    expect(cursor.sort).toHaveBeenCalledWith({ created_at: -1, _id: -1 });
    expect(body.data).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
    expect(body.data.documents[0].payload.data).toBeUndefined();
  });

  it("stores any valid 5 MB-or-smaller file against the parent space", async () => {
    admin();
    const encoded = Buffer.from("spreadsheet contents").toString("base64");
    const response = await POST(
      new Request(`http://localhost/api/expense-spaces/${spaceId}/docs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: "tax.xlsx",
          content_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          data: encoded,
        }),
      }),
      params,
    );
    expect(response.status).toBe(201);
    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: "expense_space_document",
        is_public: false,
        payload: expect.objectContaining({
          space_key: parent.payload.space_key,
          filename: "tax.xlsx",
          content_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          data: encoded,
          size: 20,
        }),
      }),
    );
  });
});
