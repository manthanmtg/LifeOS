/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { DELETE, GET, PUT } from "../route";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

const billId = "507f1f77bcf86cd799439011";
const params = { params: Promise.resolve({ id: billId }) };

const validBillPayload = {
  name: "Internet bill",
  bill_date: "2026-05-01T00:00:00.000Z",
  amount: 59.99,
  currency: "USD",
  tags: ["utilities"],
};

function createJsonRequest(body: unknown) {
  return new Request(`http://localhost/api/bills/${billId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAdminCookie() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "valid-token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

describe("/api/bills/[id] route", () => {
  let mockCollection: any;
  let mockFindOne: any;
  let mockUpdateOne: any;
  let mockDeleteOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockUpdateOne = vi.fn();
    mockDeleteOne = vi.fn();
    mockCollection = vi.fn().mockReturnValue({
      findOne: mockFindOne,
      updateOne: mockUpdateOne,
      deleteOne: mockDeleteOne,
    });

    vi.mocked(getDb).mockResolvedValue({
      collection: mockCollection,
    } as any);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null as any);
  });

  it("returns a bill document by id", async () => {
    const bill = {
      _id: billId,
      module_type: "bill",
      payload: validBillPayload,
    };
    mockFindOne.mockResolvedValue(bill);

    const response = await GET(
      new Request(`http://localhost/api/bills/${billId}`),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(bill);
    expect(mockCollection).toHaveBeenCalledWith("content");
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill",
    });
  });

  it("rejects invalid ids before reading from the database", async () => {
    const response = await GET(new Request("http://localhost/api/bills/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the bill does not exist", async () => {
    mockFindOne.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/bills/${billId}`),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
  });

  it("returns 500 when fetching a bill fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("DB unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new Request(`http://localhost/api/bills/${billId}`),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch bill");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("requires admin auth before updating a bill", async () => {
    const response = await PUT(
      createJsonRequest({ payload: validBillPayload }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 before validating payload when updating a missing bill", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue(null);

    const response = await PUT(createJsonRequest({ payload: {} }), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("rejects invalid bill payloads before updating", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue({ _id: billId, module_type: "bill" });

    const response = await PUT(
      createJsonRequest({ payload: { name: "" } }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("checks bill existence for updates without loading payload attachments", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue({ _id: billId });

    await PUT(createJsonRequest({ payload: { name: "" } }), params);

    expect(mockFindOne).toHaveBeenCalledWith(
      {
        _id: expect.any(ObjectId),
        module_type: "bill",
      },
      { projection: { _id: 1 } },
    );
  });

  it("updates a bill with parsed payload defaults", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue({ _id: billId, module_type: "bill" });
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    const response = await PUT(
      createJsonRequest({
        payload: {
          name: "Water bill",
          bill_date: "2026-05-02T00:00:00.000Z",
        },
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: {
          payload: expect.objectContaining({
            name: "Water bill",
            currency: "INR",
            attachments: [],
            tags: [],
          }),
          updated_at: expect.any(String),
        },
      },
    );
  });

  it("requires admin auth before deleting a bill", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/bills/${billId}`),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("deletes an existing bill by id", async () => {
    mockAdminCookie();
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

    const response = await DELETE(
      new Request(`http://localhost/api/bills/${billId}`),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockDeleteOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill",
    });
  });

  it("returns 404 when no bill is deleted", async () => {
    mockAdminCookie();
    mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

    const response = await DELETE(
      new Request(`http://localhost/api/bills/${billId}`),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
  });
});
