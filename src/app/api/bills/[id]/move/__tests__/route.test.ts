/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { PUT } from "../route";
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
const folderId = "507f1f77bcf86cd799439012";
const params = { params: Promise.resolve({ id: billId }) };

function createMoveRequest(body: unknown) {
  return new Request(`http://localhost/api/bills/${billId}/move`, {
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

describe("PUT /api/bills/[id]/move", () => {
  let mockFindOne: any;
  let mockUpdateOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      }),
    } as any);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null as any);
  });

  it("requires admin auth before moving a bill", async () => {
    const response = await PUT(
      createMoveRequest({ folder_id: folderId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid bill ids before reading from the database", async () => {
    mockAdminCookie();

    const response = await PUT(createMoveRequest({ folder_id: folderId }), {
      params: Promise.resolve({ id: "not-an-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("validates that folder_id is provided as a string or null", async () => {
    mockAdminCookie();

    const response = await PUT(createMoveRequest({ folder_id: 123 }), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the bill does not exist", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue(null);

    const response = await PUT(
      createMoveRequest({ folder_id: folderId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("rejects invalid target folder ids", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValueOnce({ _id: billId, module_type: "bill" });

    const response = await PUT(
      createMoveRequest({ folder_id: "bad-folder" }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid folder ID");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("returns 404 when the target folder does not exist", async () => {
    mockAdminCookie();
    mockFindOne
      .mockResolvedValueOnce({ _id: billId, module_type: "bill" })
      .mockResolvedValueOnce(null);

    const response = await PUT(
      createMoveRequest({ folder_id: folderId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Target folder not found");
    expect(mockFindOne).toHaveBeenLastCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill_folder",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("moves a bill into an existing folder", async () => {
    mockAdminCookie();
    mockFindOne
      .mockResolvedValueOnce({ _id: billId, module_type: "bill" })
      .mockResolvedValueOnce({ _id: folderId, module_type: "bill_folder" });

    const response = await PUT(
      createMoveRequest({ folder_id: folderId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: {
          "payload.folder_id": folderId,
          updated_at: expect.any(String),
        },
      },
    );
  });

  it("moves a bill back to the root when folder_id is null", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValueOnce({ _id: billId, module_type: "bill" });

    const response = await PUT(createMoveRequest({ folder_id: null }), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: { updated_at: expect.any(String) },
        $unset: { "payload.folder_id": "" },
      },
    );
  });

  it("returns 500 when moving a bill fails unexpectedly", async () => {
    mockAdminCookie();
    vi.mocked(getDb).mockRejectedValue(new Error("DB unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PUT(createMoveRequest({ folder_id: null }), params);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to move bill");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
