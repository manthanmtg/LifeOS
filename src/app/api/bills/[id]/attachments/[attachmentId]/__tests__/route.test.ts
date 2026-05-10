/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { DELETE } from "../route";
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
const attachmentId = "receipt-2";
const params = {
  params: Promise.resolve({ id: billId, attachmentId }),
};

function createRequest() {
  return new Request(
    `http://localhost/api/bills/${billId}/attachments/${attachmentId}`,
    { method: "DELETE" },
  );
}

function mockAdminCookie() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "valid-token" }),
  } as any);
  vi.mocked(verifyToken).mockResolvedValue({ role: "admin" } as any);
}

describe("DELETE /api/bills/[id]/attachments/[attachmentId]", () => {
  let mockCollection: any;
  let mockFindOne: any;
  let mockUpdateOne: any;

  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires admin auth before deleting an attachment", async () => {
    const response = await DELETE(createRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid bill ids before querying content", async () => {
    mockAdminCookie();

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: "not-an-id", attachmentId }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid ID");
    expect(getDb).not.toHaveBeenCalled();
  });

  it("returns 404 when the bill does not exist", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue(null);

    const response = await DELETE(createRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Resource not found");
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: expect.any(ObjectId),
      module_type: "bill",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("returns 404 when the bill has no attachments", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue({
      _id: billId,
      module_type: "bill",
      payload: { name: "Water bill" },
    });

    const response = await DELETE(createRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Attachment not found");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("returns 404 when the attachment is not on the bill", async () => {
    mockAdminCookie();
    mockFindOne.mockResolvedValue({
      _id: billId,
      module_type: "bill",
      payload: {
        attachments: [
          {
            id: "other-receipt",
            filename: "other.pdf",
            content_type: "application/pdf",
            data: "abcd",
            size: 3,
            uploaded_at: "2026-05-06T12:00:00.000Z",
          },
        ],
      },
    });

    const response = await DELETE(createRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Attachment not found");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("removes the matching attachment and preserves the rest", async () => {
    mockAdminCookie();
    const remainingAttachment = {
      id: "receipt-1",
      filename: "january.pdf",
      content_type: "application/pdf",
      data: "aaaa",
      size: 3,
      uploaded_at: "2026-05-01T12:00:00.000Z",
    };
    mockFindOne.mockResolvedValue({
      _id: billId,
      module_type: "bill",
      payload: {
        attachments: [
          remainingAttachment,
          {
            id: attachmentId,
            filename: "february.png",
            content_type: "image/png",
            data: "bbbb",
            size: 3,
            uploaded_at: "2026-05-02T12:00:00.000Z",
          },
        ],
      },
    });

    const response = await DELETE(createRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: {
          "payload.attachments": [remainingAttachment],
          updated_at: "2026-05-07T12:00:00.000Z",
        },
      },
    );
  });

  it("returns 500 when deleting an attachment fails unexpectedly", async () => {
    mockAdminCookie();
    vi.mocked(getDb).mockRejectedValue(new Error("DB unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await DELETE(createRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to delete attachment");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
