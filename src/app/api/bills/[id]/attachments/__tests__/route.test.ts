/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { POST } from "../route";
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

function createJsonRequest(body: unknown) {
  return new Request(`http://localhost/api/bills/${billId}/attachments`, {
    method: "POST",
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

describe("POST /api/bills/[id]/attachments", () => {
  let mockCollection: any;
  let mockFindOne: any;
  let mockUpdateOne: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T12:00:00.000Z"));

    mockFindOne = vi.fn();
    mockUpdateOne = vi.fn();
    mockCollection = vi.fn().mockReturnValue({
      findOne: mockFindOne,
      updateOne: mockUpdateOne,
    });

    vi.mocked(getDb).mockResolvedValue({
      collection: mockCollection,
    } as any);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    vi.mocked(verifyToken).mockResolvedValue(null as any);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "attachment-uuid" as `${string}-${string}-${string}-${string}-${string}`,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires admin auth before uploading an attachment", async () => {
    const response = await POST(
      createJsonRequest({
        filename: "receipt.pdf",
        content_type: "application/pdf",
        data: "abcd",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid bill ids before reading the request body", async () => {
    mockAdminCookie();

    const response = await POST(
      createJsonRequest({
        filename: "receipt.pdf",
        content_type: "application/pdf",
        data: "abcd",
      }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns validation errors for incomplete attachment payloads", async () => {
    mockAdminCookie();

    const response = await POST(
      createJsonRequest({
        filename: "",
        content_type: "application/pdf",
        data: "abcd",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types", async () => {
    mockAdminCookie();

    const response = await POST(
      createJsonRequest({
        filename: "notes.txt",
        content_type: "text/plain",
        data: "abcd",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Only image files and PDFs are allowed");
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("rejects files over the 5 MB decoded size limit", async () => {
    mockAdminCookie();

    const response = await POST(
      createJsonRequest({
        filename: "large.pdf",
        content_type: "application/pdf",
        data: "a".repeat(7_000_000),
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("File exceeds 5 MB limit");
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("returns 404 when the target bill does not exist", async () => {
    mockAdminCookie();
    mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

    const response = await POST(
      createJsonRequest({
        filename: "receipt.pdf",
        content_type: "application/pdf",
        data: "abcd",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId), module_type: "bill" },
      expect.any(Object),
    );
  });

  it("appends the uploaded attachment to existing bill attachments", async () => {
    mockAdminCookie();
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });

    const response = await POST(
      createJsonRequest({
        filename: "receipt.png",
        content_type: "image/png",
        data: "abcd",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual({
      id: "attachment-uuid",
      filename: "receipt.png",
      content_type: "image/png",
      data: "abcd",
      size: 3,
      uploaded_at: "2026-05-07T12:00:00.000Z",
    });
    expect(mockCollection).toHaveBeenCalledWith("content");
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId), module_type: "bill" },
      {
        $push: { "payload.attachments": body.data },
        $set: { updated_at: "2026-05-07T12:00:00.000Z" },
      },
    );
  });

  it("returns 500 when uploading an attachment fails unexpectedly", async () => {
    mockAdminCookie();
    vi.mocked(getDb).mockRejectedValue(new Error("DB unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(
      createJsonRequest({
        filename: "receipt.pdf",
        content_type: "application/pdf",
        data: "abcd",
      }),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to upload attachment");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
