/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const id = "507f1f77bcf86cd799439011";
const params = { params: Promise.resolve({ spaceId: id }) };
const spaceKey = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";

const space = {
  _id: id,
  module_type: "expense_space",
  is_public: false,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-18T00:00:00.000Z",
  payload: {
    space_key: spaceKey,
    name: "House Renovation",
    currency: "INR",
    number_format: "indian",
    status: "active",
    categories: [
      {
        id: categoryId,
        name: "Other",
        is_active: true,
        subcategories: [],
      },
    ],
  },
};

function admin() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

function request(method: string, body?: unknown) {
  return new Request(`http://localhost/api/expense-spaces/${id}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("/api/expense-spaces/[spaceId]", () => {
  let collection: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);
    collection = {
      findOne: vi.fn().mockResolvedValue(space),
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      countDocuments: vi.fn().mockResolvedValue(0),
      distinct: vi
        .fn()
        .mockResolvedValueOnce([categoryId])
        .mockResolvedValueOnce([]),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 4 }),
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
  });

  it("requires admin auth before reading a private space", async () => {
    const response = await GET(request("GET"), params);
    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns a space with its entry count", async () => {
    admin();
    collection.countDocuments.mockResolvedValue(7);

    const response = await GET(request("GET"), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      payload: { name: "House Renovation" },
      entry_count: 7,
      used_category_ids: [categoryId],
      used_subcategory_ids: [],
    });
    expect(collection.countDocuments).toHaveBeenCalledWith({
      module_type: "expense_space_entry",
      "payload.space_key": spaceKey,
    });
  });

  it("locks currency after entries exist", async () => {
    admin();
    collection.countDocuments.mockResolvedValue(1);

    const response = await PUT(
      request("PUT", {
        ...space.payload,
        space_key: undefined,
        currency: "USD",
        expected_updated_at: space.updated_at,
      }),
      params,
    );

    expect(response.status).toBe(409);
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it("rejects removal of a used category", async () => {
    admin();
    collection.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const response = await PUT(
      request("PUT", {
        ...space.payload,
        space_key: undefined,
        categories: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Replacement",
            is_active: true,
            subcategories: [],
          },
        ],
        expected_updated_at: space.updated_at,
      }),
      params,
    );

    expect(response.status).toBe(409);
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it("preserves space_key and uses optimistic concurrency when updating", async () => {
    admin();

    const response = await PUT(
      request("PUT", {
        ...space.payload,
        space_key: "99999999-9999-4999-8999-999999999999",
        name: "Renovation 2026",
        expected_updated_at: space.updated_at,
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(collection.updateOne).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        module_type: "expense_space",
        updated_at: space.updated_at,
      },
      {
        $set: {
          payload: expect.objectContaining({
            space_key: spaceKey,
            name: "Renovation 2026",
          }),
          updated_at: "2026-08-19T10:00:00.000Z",
        },
      },
    );
  });

  it("returns 409 for a stale update instead of overwriting", async () => {
    admin();
    collection.updateOne.mockResolvedValue({ matchedCount: 0 });

    const response = await PUT(
      request("PUT", {
        ...space.payload,
        space_key: undefined,
        expected_updated_at: space.updated_at,
      }),
      params,
    );

    expect(response.status).toBe(409);
  });

  it("requires the exact name before cascading a hard delete", async () => {
    admin();
    const rejected = await DELETE(
      request("DELETE", { confirmation: "house renovation" }),
      params,
    );
    expect(rejected.status).toBe(400);
    expect(collection.deleteMany).not.toHaveBeenCalled();

    const accepted = await DELETE(
      request("DELETE", { confirmation: "House Renovation" }),
      params,
    );
    const body = await accepted.json();
    expect(accepted.status).toBe(200);
    expect(collection.deleteMany).toHaveBeenCalledBefore(collection.deleteOne);
    expect(body.data).toEqual({ spaces_deleted: 1, entries_deleted: 4 });
  });
});
