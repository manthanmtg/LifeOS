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

const spaceKey = "11111111-1111-4111-8111-111111111111";

function admin() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

function post(body: unknown) {
  return new Request("http://localhost/api/expense-spaces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/expense-spaces", () => {
  let collection: any;
  let findToArray: any;
  let aggregateToArray: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null);
    findToArray = vi.fn().mockResolvedValue([]);
    aggregateToArray = vi.fn().mockResolvedValue([]);
    collection = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({ toArray: findToArray }),
        toArray: findToArray,
      }),
      aggregate: vi.fn().mockReturnValue({ toArray: aggregateToArray }),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "space-id" }),
    };
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    } as any);
  });

  it("requires explicit route-level admin auth before listing spaces", async () => {
    const response = await GET(
      new Request("http://localhost/api/expense-spaces"),
    );

    expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("lists active spaces with compact per-space summaries", async () => {
    admin();
    findToArray.mockResolvedValue([
      {
        _id: "space-id",
        module_type: "expense_space",
        is_public: false,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        payload: {
          space_key: spaceKey,
          name: "House Renovation",
          currency: "INR",
          number_format: "indian",
          status: "active",
          categories: [],
        },
      },
    ]);
    aggregateToArray.mockResolvedValue([
      {
        _id: spaceKey,
        entry_count: 3,
        total_spend: 500,
        this_month_spend: 200,
        last_entry_date: "2026-08-18",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/expense-spaces"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(collection.find).toHaveBeenCalledWith(
      { module_type: "expense_space", "payload.status": "active" },
      expect.objectContaining({ projection: expect.any(Object) }),
    );
    expect(body.data[0]).toMatchObject({
      _id: "space-id",
      payload: { name: "House Renovation", currency: "INR" },
      summary: {
        entry_count: 3,
        total_spend: 500,
        this_month_spend: 200,
        last_entry_date: "2026-08-18",
      },
    });
  });

  it("rejects unknown status filters", async () => {
    admin();
    const response = await GET(
      new Request("http://localhost/api/expense-spaces?status=deleted"),
    );

    expect(response.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("creates a private space with server UUIDs and a default Other category", async () => {
    admin();
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce(spaceKey)
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");

    const response = await POST(
      post({ name: "Pet Expenses", currency: "USD" }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(collection.insertOne).toHaveBeenCalledWith({
      module_type: "expense_space",
      is_public: false,
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:00:00.000Z",
      payload: {
        space_key: spaceKey,
        name: "Pet Expenses",
        currency: "USD",
        number_format: "western",
        status: "active",
        categories: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Other",
            is_active: true,
            subcategories: [],
          },
        ],
      },
    });
    expect(body.data).toMatchObject({
      _id: "space-id",
      is_public: false,
      payload: { name: "Pet Expenses" },
    });
  });

  it("rejects normalized duplicate names before inserting", async () => {
    admin();
    findToArray.mockResolvedValue([
      { _id: "existing", payload: { name: "House   Renovation" } },
    ]);

    const response = await POST(post({ name: " house renovation " }));

    expect(response.status).toBe(409);
    expect(collection.insertOne).not.toHaveBeenCalled();
  });
});
