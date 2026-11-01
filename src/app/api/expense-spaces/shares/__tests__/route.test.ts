// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST, PATCH, DELETE } from "../route";
import { getDb } from "@/lib/mongodb";
import { requireExpenseSpacesAdmin } from "@/lib/expense-spaces/server";
import { ObjectId } from "mongodb";
import {
  createShareToken,
  createShortShareToken,
  hashShareToken,
} from "@/lib/expense-spaces/share-token";
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/expense-spaces/server", () => ({
  requireExpenseSpacesAdmin: vi.fn(),
  logExpenseSpacesRouteError: vi.fn(),
}));
const id = new ObjectId();
const request = (method: string, body: unknown) =>
  new Request("http://localhost/api/expense-spaces/shares", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
describe("share management", () => {
  const shares = {
    find: vi.fn(),
    findOne: vi.fn(),
    createIndex: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  };
  const content = { findOne: vi.fn(), find: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.JWT_SECRET = "test-secret";
    vi.mocked(requireExpenseSpacesAdmin).mockResolvedValue(true);
    vi.mocked(getDb).mockResolvedValue({
      collection: (name: string) => (name === "content" ? content : shares),
    } as never);
    content.findOne.mockResolvedValue({ _id: id });
    shares.findOne.mockResolvedValue(null);
    shares.createIndex.mockResolvedValue("tokenHash_1");
  });
  it("requires admin authentication for every management action", async () => {
    vi.mocked(requireExpenseSpacesAdmin).mockResolvedValue(false);
    for (const response of [
      await GET(),
      await POST(request("POST", {})),
      await PATCH(request("PATCH", {})),
      await DELETE(request("DELETE", {})),
    ])
      expect(response.status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });
  it("creates one share only for an existing space and stores a hash", async () => {
    shares.updateOne.mockResolvedValue({ upsertedCount: 1 });
    const response = await POST(request("POST", { spaceId: String(id) }));
    expect(response.status).toBe(201);
    const { data } = await response.json();
    const stored = shares.updateOne.mock.calls[0][1].$setOnInsert;
    expect(data.token).toHaveLength(6);
    expect(stored.tokenVersion).toBe(2);
    expect(shares.createIndex).toHaveBeenCalledWith(
      { tokenHash: 1 },
      { unique: true },
    );
    expect(stored.tokenHash).toHaveLength(64);
    expect(JSON.stringify(stored)).not.toContain(data.token);
    shares.updateOne.mockResolvedValue({ upsertedCount: 0 });
    expect((await POST(request("POST", { spaceId: String(id) }))).status).toBe(
      409,
    );
    content.findOne.mockResolvedValue(null);
    expect((await POST(request("POST", { spaceId: String(id) }))).status).toBe(
      404,
    );
  });
  it("returns the right link for both existing and new shares", async () => {
    const oldId = new ObjectId();
    const nonce = "a".repeat(64);
    const oldToken = createShareToken(nonce, "test-secret");
    const newToken = createShortShareToken(nonce, "test-secret");
    shares.find.mockReturnValue({
      toArray: async () => [
        {
          _id: oldId,
          nonce,
          tokenHash: hashShareToken(oldToken),
          paused: false,
        },
        {
          _id: id,
          nonce,
          tokenHash: hashShareToken(newToken),
          tokenVersion: 2,
          paused: false,
        },
      ],
    });
    content.find.mockReturnValue({
      toArray: async () => [
        { _id: oldId, payload: { name: "Old" } },
        { _id: id, payload: { name: "New" } },
      ],
    });
    const response = await GET();
    const { data } = await response.json();
    expect(data.map((share: { token: string }) => share.token)).toEqual([
      oldToken,
      newToken,
    ]);
  });
  it("retries when a newly generated short token collides", async () => {
    shares.updateOne
      .mockRejectedValueOnce({ code: 11000 })
      .mockResolvedValueOnce({ upsertedCount: 1 });
    const result = await POST(request("POST", { spaceId: String(id) }));
    expect(result.status).toBe(201);
    expect(shares.updateOne).toHaveBeenCalledTimes(2);
    expect(shares.updateOne.mock.calls[0][1].$setOnInsert.tokenHash).not.toBe(
      shares.updateOne.mock.calls[1][1].$setOnInsert.tokenHash,
    );
  });
  it("pauses, resumes and deletes a share", async () => {
    shares.updateOne.mockResolvedValue({ matchedCount: 1 });
    shares.deleteOne.mockResolvedValue({ deletedCount: 1 });
    expect(
      (await PATCH(request("PATCH", { spaceId: String(id), paused: true })))
        .status,
    ).toBe(200);
    expect(shares.updateOne.mock.calls[0][1]).toEqual({
      $set: { paused: true },
    });
    expect(
      (await PATCH(request("PATCH", { spaceId: String(id), paused: false })))
        .status,
    ).toBe(200);
    expect(
      (await DELETE(request("DELETE", { spaceId: String(id) }))).status,
    ).toBe(200);
    expect(
      (await PATCH(request("PATCH", { spaceId: String(id), paused: "false" })))
        .status,
    ).toBe(400);
  });
});
