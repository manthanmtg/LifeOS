/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
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

function createRequest(body: unknown) {
  return new Request("http://localhost/api/bills/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/bills/folders", () => {
  let mockFind: any;
  let mockSort: any;
  let mockToArray: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToArray = vi.fn().mockResolvedValue([]);
    mockSort = vi.fn().mockReturnValue({ toArray: mockToArray });
    mockFind = vi.fn().mockReturnValue({ sort: mockSort });

    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ find: mockFind }),
    } as any);
  });

  it("returns all bill folders sorted by created_at", async () => {
    const mockFolders = [
      { _id: "1", module_type: "bill_folder", payload: { name: "A" } },
      { _id: "2", module_type: "bill_folder", payload: { name: "B" } },
    ];
    mockToArray.mockResolvedValue(mockFolders);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(mockFolders);
    expect(mockFind).toHaveBeenCalledWith({ module_type: "bill_folder" });
    expect(mockSort).toHaveBeenCalledWith({ created_at: 1 });
  });

  it("returns 500 if database fetch fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch folders");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("POST /api/bills/folders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
  });

  it("returns 401 if unauthorized", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null as any);

    const response = await POST(createRequest({ payload: { name: "Test" } }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 if validation fails", async () => {
    const response = await POST(createRequest({ payload: { name: "" } })); // Empty name
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("creates a new folder on success", async () => {
    const mockInsertResult = { insertedId: "new-id" };
    const mockInsertOne = vi.fn().mockResolvedValue(mockInsertResult);
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ insertOne: mockInsertOne }),
    } as any);

    const payload = { name: "New Folder", color: "#FFFFFF" };
    const response = await POST(createRequest({ payload }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.payload).toEqual(payload);
    expect(body.data.insertedId).toBe("new-id");
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: "bill_folder",
        payload: payload,
      }),
    );
  });

  it("returns 500 if creation fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest({ payload: { name: "Test" } }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to create folder");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
