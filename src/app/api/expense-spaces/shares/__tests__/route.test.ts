// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST, PATCH, DELETE } from "../route";
import { getDb } from "@/lib/mongodb";
import { requireExpenseSpacesAdmin } from "@/lib/expense-spaces/server";
import { ObjectId } from "mongodb";
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
  const shares = { find: vi.fn(), updateOne: vi.fn(), deleteOne: vi.fn() };
  const content = { findOne: vi.fn(), find: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    vi.mocked(requireExpenseSpacesAdmin).mockResolvedValue(true);
    vi.mocked(getDb).mockResolvedValue({
      collection: (name: string) => (name === "content" ? content : shares),
    } as never);
    content.findOne.mockResolvedValue({ _id: id });
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
