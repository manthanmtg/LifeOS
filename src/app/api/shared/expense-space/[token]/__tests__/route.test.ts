// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { getDb } from "@/lib/mongodb";
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));

describe("public expense space", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects malformed tokens without querying the database", async () => {
    const response = await GET(
      new Request("http://localhost/api/shared/expense-space/bad"),
      { params: Promise.resolve({ token: "bad" }) },
    );
    expect(response.status).toBe(404);
    expect(getDb).not.toHaveBeenCalled();
  });
  it("accepts a six-character code for lookup", async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    vi.mocked(getDb).mockResolvedValue({
      collection: () => ({ findOne }),
    } as never);
    const response = await GET(
      new Request("http://localhost/api/shared/expense-space/aB3_xZ"),
      { params: Promise.resolve({ token: "aB3_xZ" }) },
    );
    expect(response.status).toBe(404);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ paused: false, tokenHash: expect.any(String) }),
    );
  });
  it("returns the same unavailable response for paused or unknown shares", async () => {
    vi.mocked(getDb).mockResolvedValue({
      collection: () => ({ findOne: vi.fn().mockResolvedValue(null) }),
    } as never);
    const response = await GET(
      new Request("http://localhost/api/shared/expense-space/token"),
      { params: Promise.resolve({ token: "a".repeat(43) }) },
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});

it("reads fresh, space-scoped entries and exposes only public fields", async () => {
  const id = new (await import("mongodb")).ObjectId();
  const token = "b".repeat(43);
  const parent = {
    _id: id,
    payload: {
      space_key: "space-a",
      name: "Trip",
      currency: "USD",
      number_format: "western",
      categories: [],
      internal: "secret",
    },
  };
  const entry = {
    _id: new (await import("mongodb")).ObjectId(),
    payload: {
      space_key: "space-a",
      description: "Dinner",
      amount: 20,
      currency: "USD",
      paid_to: "Cafe",
      category_id: "food",
      date: "2026-01-01",
      tags: [],
      notes: "shared note",
      receipts: [
        {
          filename: "receipt.pdf",
          data: "private-base64",
          content_type: "application/pdf",
        },
      ],
      internal: "secret",
    },
  };
  let amount = 20;
  const find = vi.fn(
    (query: { module_type: string; "payload.space_key": string }) => {
      expect(query["payload.space_key"]).toBe("space-a");
      const rows =
        query.module_type === "expense_space_entry"
          ? [{ ...entry, payload: { ...entry.payload, amount } }]
          : [];
      const cursor = {
        sort: () => cursor,
        skip: () => cursor,
        limit: () => cursor,
        toArray: async () => rows,
      };
      return cursor;
    },
  );
  const content = {
    findOne: vi.fn().mockResolvedValue(parent),
    find,
    countDocuments: vi.fn().mockResolvedValue(1),
    aggregate: vi.fn(() => ({
      toArray: async () => [{ total: amount, month: 0, count: 1 }],
    })),
  };
  const shares = { findOne: vi.fn().mockResolvedValue({ _id: id }) };
  vi.mocked(getDb).mockResolvedValue({
    collection: (name: string) => (name === "content" ? content : shares),
  } as never);
  const params = { params: Promise.resolve({ token }) };
  const first = await GET(
    new Request("http://localhost/api/shared/expense-space/token"),
    params,
  );
  const body = await first.json();
  expect(body.entries[0].amount).toBe(20);
  expect(body.entries[0].receipts).toEqual([
    { filename: "receipt.pdf", index: 0 },
  ]);
  expect(JSON.stringify(body)).not.toContain("private-base64");
  expect(JSON.stringify(body)).not.toContain("space-a");
  expect(JSON.stringify(body)).not.toContain("secret");
  expect(shares.findOne).toHaveBeenCalledWith(
    expect.objectContaining({ paused: false }),
  );
  amount = 42;
  const second = await GET(
    new Request("http://localhost/api/shared/expense-space/token"),
    params,
  );
  expect((await second.json()).entries[0].amount).toBe(42);
});
