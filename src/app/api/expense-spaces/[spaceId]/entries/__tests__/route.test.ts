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

const id = "507f1f77bcf86cd799439011";
const params = { params: Promise.resolve({ spaceId: id }) };
const spaceKey = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const subcategoryId = "33333333-3333-4333-8333-333333333333";

const parent = {
  _id: id,
  module_type: "expense_space",
  payload: {
    space_key: spaceKey,
    name: "House Renovation",
    currency: "INR",
    status: "active",
    categories: [
      {
        id: categoryId,
        name: "Materials",
        is_active: true,
        subcategories: [
          { id: subcategoryId, name: "Flooring", is_active: true },
        ],
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

function createPost(body: unknown) {
  return new Request(`http://localhost/api/expense-spaces/${id}/entries`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/expense-spaces/[spaceId]/entries", () => {
  let collection: any;
  let cursor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);
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
      distinct: vi.fn().mockResolvedValue([]),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "entry-id" }),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
  });

  it("requires admin auth before reading entries", async () => {
    const response = await GET(
      new Request(`http://localhost/api/expense-spaces/${id}/entries`),
      params,
    );
    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("applies owned filters, pagination, projection, and facets", async () => {
    admin();
    collection.countDocuments.mockResolvedValue(2);
    collection.distinct
      .mockResolvedValueOnce(["Acme   Ltd", " acme ltd "])
      .mockResolvedValueOnce(["UPI"]);
    cursor.toArray.mockResolvedValue([
      {
        _id: "entry-id",
        module_type: "expense_space_entry",
        payload: { amount: 100, date: "2026-08-18" },
      },
    ]);

    const response = await GET(
      new Request(
        `http://localhost/api/expense-spaces/${id}/entries?search=ACME+(North)&date_from=2026-08-01&category_id=${categoryId}&page=1&page_size=25&sort=amount-desc`,
      ),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(collection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: "expense_space_entry",
        "payload.space_key": spaceKey,
        "payload.date": { $gte: "2026-08-01" },
        "payload.category_id": categoryId,
        $or: expect.any(Array),
      }),
      expect.objectContaining({ projection: expect.any(Object) }),
    );
    expect(cursor.sort).toHaveBeenCalledWith({ "payload.amount": -1, _id: -1 });
    expect(cursor.skip).toHaveBeenCalledWith(0);
    expect(cursor.limit).toHaveBeenCalledWith(25);
    expect(body.data).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 2,
      totalPages: 1,
      facets: { paid_to: ["Acme Ltd"], payment_methods: ["UPI"] },
    });
  });

  it("rejects filters that reference taxonomy outside the parent", async () => {
    admin();
    const response = await GET(
      new Request(
        `http://localhost/api/expense-spaces/${id}/entries?category_id=44444444-4444-4444-8444-444444444444`,
      ),
      params,
    );

    expect(response.status).toBe(400);
    expect(collection.find).not.toHaveBeenCalled();
  });

  it("stamps immutable parent and currency fields when creating an entry", async () => {
    admin();
    const response = await POST(
      createPost({
        amount: 250,
        currency: "USD",
        space_key: "99999999-9999-4999-8999-999999999999",
        description: "Floor tiles",
        paid_to: "Supplier",
        category_id: categoryId,
        subcategory_id: subcategoryId,
        date: "2026-08-19",
        tags: [],
      }),
      params,
    );

    expect(response.status).toBe(201);
    expect(collection.insertOne).toHaveBeenCalledWith({
      module_type: "expense_space_entry",
      is_public: false,
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:00:00.000Z",
      payload: expect.objectContaining({
        space_key: spaceKey,
        currency: "INR",
        amount: 250,
        category_id: categoryId,
        subcategory_id: subcategoryId,
      }),
    });
  });

  it("rejects writes to archived spaces", async () => {
    admin();
    collection.findOne.mockResolvedValue({
      ...parent,
      payload: { ...parent.payload, status: "archived" },
    });

    const response = await POST(
      createPost({
        amount: 10,
        description: "Archived expense",
        paid_to: "Supplier",
        category_id: categoryId,
        date: "2026-08-19",
      }),
      params,
    );

    expect(response.status).toBe(409);
    expect(collection.insertOne).not.toHaveBeenCalled();
  });
});
