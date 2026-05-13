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

const folderId = "507f1f77bcf86cd799439011";
const parentId = "507f1f77bcf86cd799439012";
const childId = "507f1f77bcf86cd799439013";
const params = { params: Promise.resolve({ id: folderId }) };

function createMoveRequest(body: unknown) {
  return new Request(`http://localhost/api/bills/folders/${folderId}/move`, {
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

describe("PUT /api/bills/folders/[id]/move", () => {
  let mockFindOne: any;
  let mockFind: any;
  let mockToArray: any;
  let mockUpdateOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockToArray = vi.fn().mockResolvedValue([]);
    mockFind = vi.fn().mockReturnValue({ toArray: mockToArray });
    mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: mockFindOne,
        find: mockFind,
        updateOne: mockUpdateOne,
      }),
    } as any);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null as any);
  });

  it("requires admin auth before moving a folder", async () => {
    const response = await PUT(
      createMoveRequest({ parent_id: parentId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid folder ids before reading from the database", async () => {
    mockAdminCookie();

    const response = await PUT(createMoveRequest({ parent_id: parentId }), {
      params: Promise.resolve({ id: "not-an-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("validates that parent_id is provided as a string or null", async () => {
    mockAdminCookie();

    const response = await PUT(createMoveRequest({ parent_id: 123 }), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the folder does not exist", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue(null);

    const response = await PUT(
      createMoveRequest({ parent_id: parentId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill_folder",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("prevents moving a folder into itself", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValueOnce({
      _id: new ObjectId(folderId),
      module_type: "bill_folder",
    });

    const response = await PUT(
      createMoveRequest({ parent_id: folderId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot move folder into itself");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("prevents moving a folder into one of its descendants", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValueOnce({
      _id: new ObjectId(folderId),
      module_type: "bill_folder",
    });
    mockToArray.mockResolvedValue([
      {
        _id: new ObjectId(childId),
        module_type: "bill_folder",
        payload: { name: "Child", parent_id: folderId },
      },
    ]);

    const response = await PUT(
      createMoveRequest({ parent_id: childId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot move folder into its own descendant");
    expect(mockFind).toHaveBeenCalledWith({ module_type: "bill_folder" });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("returns 404 when the target parent folder does not exist", async () => {
    mockAdminCookie();
    mockFindOne
      .mockResolvedValueOnce({
        _id: new ObjectId(folderId),
        module_type: "bill_folder",
      })
      .mockResolvedValueOnce(null);

    const response = await PUT(
      createMoveRequest({ parent_id: parentId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Target parent folder not found");
    expect(mockFindOne).toHaveBeenLastCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill_folder",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("moves a folder into an existing parent folder", async () => {
    mockAdminCookie();
    mockFindOne
      .mockResolvedValueOnce({
        _id: new ObjectId(folderId),
        module_type: "bill_folder",
      })
      .mockResolvedValueOnce({
        _id: new ObjectId(parentId),
        module_type: "bill_folder",
      });

    const response = await PUT(
      createMoveRequest({ parent_id: parentId }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: {
          "payload.parent_id": parentId,
          updated_at: expect.any(String),
        },
      },
    );
  });

  it("moves a folder back to the root when parent_id is null", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValueOnce({
      _id: new ObjectId(folderId),
      module_type: "bill_folder",
    });

    const response = await PUT(createMoveRequest({ parent_id: null }), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: { updated_at: expect.any(String) },
        $unset: { "payload.parent_id": "" },
      },
    );
  });

  it("returns 500 when moving a folder fails unexpectedly", async () => {
    mockAdminCookie();
    vi.mocked(getDb).mockRejectedValue(new Error("DB unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PUT(createMoveRequest({ parent_id: null }), params);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to move folder");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
