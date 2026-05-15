/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { DELETE, PUT } from "../route";
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
const childFolderId = "507f1f77bcf86cd799439012";
const params = { params: Promise.resolve({ id: folderId }) };

function createUpdateRequest(body: unknown) {
  return new Request(`http://localhost/api/bills/folders/${folderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest() {
  return new Request(`http://localhost/api/bills/folders/${folderId}`, {
    method: "DELETE",
  });
}

function mockAdminCookie() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "valid-token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

describe("/api/bills/folders/[id] route", () => {
  let mockCollection: any;
  let mockFindOne: any;
  let mockFind: any;
  let mockToArray: any;
  let mockUpdateOne: any;
  let mockUpdateMany: any;
  let mockDeleteOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockToArray = vi.fn().mockResolvedValue([]);
    mockFind = vi.fn().mockReturnValue({ toArray: mockToArray });
    mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    mockUpdateMany = vi.fn().mockResolvedValue({ modifiedCount: 0 });
    mockDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
    mockCollection = vi.fn().mockReturnValue({
      findOne: mockFindOne,
      find: mockFind,
      updateOne: mockUpdateOne,
      updateMany: mockUpdateMany,
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

  it("requires admin auth before updating a folder", async () => {
    const response = await PUT(
      createUpdateRequest({ payload: { name: "Utilities" } }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid folder ids before updating", async () => {
    mockAdminCookie();

    const response = await PUT(
      createUpdateRequest({ payload: { name: "Utilities" } }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("validates folder payloads before reading from the database", async () => {
    mockAdminCookie();

    const response = await PUT(
      createUpdateRequest({ payload: { name: "", color: "blue" } }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the folder does not exist", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue(null);

    const response = await PUT(
      createUpdateRequest({ payload: { name: "Utilities" } }),
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

  it("updates an existing folder with parsed payload fields", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue({
      _id: new ObjectId(folderId),
      module_type: "bill_folder",
    });

    const response = await PUT(
      createUpdateRequest({
        payload: { name: "  Utilities  ", color: "#abc" },
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
          payload: { name: "Utilities", color: "#abc" },
          updated_at: expect.any(String),
        },
      },
    );
  });

  it("requires admin auth before deleting a folder", async () => {
    const response = await DELETE(createDeleteRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("moves root and child folder bills before deleting a folder tree", async () => {
    mockAdminCookie();
    mockToArray.mockResolvedValue([
      {
        _id: new ObjectId(childFolderId),
        module_type: "bill_folder",
        payload: { name: "Child", parent_id: folderId },
      },
    ]);

    const response = await DELETE(createDeleteRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateMany).toHaveBeenNthCalledWith(
      1,
      { module_type: "bill", "payload.folder_id": folderId },
      {
        $unset: { "payload.folder_id": "" },
        $set: { updated_at: expect.any(String) },
      },
    );
    expect(mockFind).toHaveBeenCalledWith({
      module_type: "bill_folder",
      "payload.parent_id": folderId,
    });
    expect(mockUpdateMany).toHaveBeenNthCalledWith(
      2,
      { module_type: "bill", "payload.folder_id": childFolderId },
      {
        $unset: { "payload.folder_id": "" },
        $set: { updated_at: expect.any(String) },
      },
    );
    expect(mockDeleteOne).toHaveBeenNthCalledWith(1, {
      _id: expect.any(ObjectId),
    });
    expect(mockDeleteOne).toHaveBeenNthCalledWith(2, {
      _id: expect.any(ObjectId),
      module_type: "bill_folder",
    });
  });

  it("returns 404 when no folder is deleted", async () => {
    mockAdminCookie();
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 0 });

    const response = await DELETE(createDeleteRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
  });

  it("returns 500 when updating a folder fails unexpectedly", async () => {
    mockAdminCookie();
    vi.mocked(getDb).mockRejectedValue(new Error("DB unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PUT(
      createUpdateRequest({ payload: { name: "Utilities" } }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to update folder");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
