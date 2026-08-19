/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyToken: vi.fn() }));

const spaceId = "507f1f77bcf86cd799439011";
const spaceKey = "11111111-1111-4111-8111-111111111111";

const parent = {
  _id: spaceId,
  payload: {
    space_key: spaceKey,
    name: "House Renovation",
    currency: "INR",
    status: "archived",
    categories: [],
  },
};

function admin() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

describe("GET /api/expense-spaces/analytics", () => {
  let collection: any;
  let parentToArray: any;
  let entryToArray: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);
    parentToArray = vi.fn().mockResolvedValue([parent]);
    entryToArray = vi.fn().mockResolvedValue([
      {
        _id: "entry-id",
        payload: {
          space_key: spaceKey,
          amount: 100,
          currency: "INR",
          description: "Tiles",
          paid_to: "Supplier",
          category_id: "22222222-2222-4222-8222-222222222222",
          date: "2026-08-19",
          tags: [],
        },
      },
    ]);
    collection = {
      findOne: vi.fn().mockResolvedValue(parent),
      find: vi.fn((query: { module_type?: string }) =>
        query.module_type === "expense_space"
          ? { toArray: parentToArray }
          : { toArray: entryToArray },
      ),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
  });

  it("requires route-level admin auth", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/expense-spaces/analytics?scope=all&currency=INR",
      ),
    );
    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("requires a currency for all-space analytics", async () => {
    admin();
    const response = await GET(
      new Request("http://localhost/api/expense-spaces/analytics?scope=all"),
    );
    expect(response.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("derives currency from a selected space and uses narrow projections", async () => {
    admin();
    const response = await GET(
      new Request(
        `http://localhost/api/expense-spaces/analytics?scope=space&space_id=${spaceId}&date_from=2026-08-01&date_to=2026-08-31`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      scope: "space",
      currency: "INR",
      totals: { amount: 100, count: 1, average: 100 },
      no_conversion: true,
    });
    expect(collection.find).toHaveBeenLastCalledWith(
      {
        module_type: "expense_space_entry",
        "payload.space_key": spaceKey,
        "payload.currency": "INR",
        "payload.date": { $gte: "2026-08-01", $lte: "2026-08-31" },
      },
      {
        projection: {
          _id: 1,
          "payload.space_key": 1,
          "payload.amount": 1,
          "payload.currency": 1,
          "payload.date": 1,
          "payload.paid_to": 1,
          "payload.category_id": 1,
          "payload.subcategory_id": 1,
          "payload.payment_method": 1,
          "payload.description": 1,
        },
      },
    );
  });

  it("includes archived parents and isolates an explicit all-space currency", async () => {
    admin();
    const response = await GET(
      new Request(
        "http://localhost/api/expense-spaces/analytics?scope=all&currency=INR",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(collection.find).toHaveBeenCalledWith(
      { module_type: "expense_space" },
      expect.objectContaining({ projection: expect.any(Object) }),
    );
    expect(body.data.available_currencies).toEqual(["INR"]);
    expect(body.data.totals.amount).toBe(100);
  });
});
