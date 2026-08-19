/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const spaceId = "507f1f77bcf86cd799439011";
const entryId = "507f1f77bcf86cd799439012";
const params = { params: Promise.resolve({ spaceId, entryId }) };
const spaceKey = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";

const parent = {
  _id: spaceId,
  module_type: "expense_space",
  payload: {
    space_key: spaceKey,
    currency: "INR",
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

const entry = {
  _id: entryId,
  module_type: "expense_space_entry",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  payload: {
    space_key: spaceKey,
    currency: "INR",
    amount: 10,
    description: "Old expense",
    paid_to: "Supplier",
    category_id: categoryId,
    date: "2026-08-01",
    tags: [],
  },
};

function admin() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

function request(method: string, body?: unknown) {
  return new Request(
    `http://localhost/api/expense-spaces/${spaceId}/entries/${entryId}`,
    {
      method,
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
}

describe("/api/expense-spaces/[spaceId]/entries/[entryId]", () => {
  let collection: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
    admin();
    collection = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(entry),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
  });

  it("returns 404 when an entry is not owned by the route parent", async () => {
    collection.findOne
      .mockReset()
      .mockResolvedValueOnce(parent)
      .mockResolvedValueOnce(null);

    const response = await PUT(
      request("PUT", {
        amount: 12,
        description: "Updated expense",
        paid_to: "Supplier",
        category_id: categoryId,
        date: "2026-08-01",
      }),
      params,
    );

    expect(response.status).toBe(404);
    expect(collection.findOne).toHaveBeenLastCalledWith({
      _id: expect.any(Object),
      module_type: "expense_space_entry",
      "payload.space_key": spaceKey,
    });
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it("preserves immutable space and currency fields during replacement", async () => {
    const response = await PUT(
      request("PUT", {
        amount: 12,
        currency: "USD",
        space_key: "99999999-9999-4999-8999-999999999999",
        description: "Updated expense",
        paid_to: "Supplier",
        category_id: categoryId,
        date: "2026-08-19",
        tags: ["Updated"],
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(collection.updateOne).toHaveBeenCalledWith(
      {
        _id: expect.any(Object),
        module_type: "expense_space_entry",
        "payload.space_key": spaceKey,
      },
      {
        $set: {
          payload: expect.objectContaining({
            space_key: spaceKey,
            currency: "INR",
            amount: 12,
          }),
          updated_at: "2026-08-19T10:00:00.000Z",
        },
      },
    );
  });

  it("rejects update and delete while the parent is archived", async () => {
    collection.findOne.mockReset().mockResolvedValue({
      ...parent,
      payload: { ...parent.payload, status: "archived" },
    });

    const updateResponse = await PUT(request("PUT", {}), params);
    expect(updateResponse.status).toBe(409);
    expect(collection.updateOne).not.toHaveBeenCalled();

    const deleteResponse = await DELETE(request("DELETE"), params);
    expect(deleteResponse.status).toBe(409);
    expect(collection.deleteOne).not.toHaveBeenCalled();
  });

  it("deletes only an entry owned by the route parent", async () => {
    const response = await DELETE(request("DELETE"), params);

    expect(response.status).toBe(200);
    expect(collection.deleteOne).toHaveBeenCalledWith({
      _id: expect.any(Object),
      module_type: "expense_space_entry",
      "payload.space_key": spaceKey,
    });
  });
});
