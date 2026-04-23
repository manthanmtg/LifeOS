/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "../route";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";

function createRequest(body: unknown) {
  return new Request("http://localhost/api/system", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/system", () => {
  let mockUpdateOne: any;
  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    mockCollection = vi.fn().mockReturnValue({ updateOne: mockUpdateOne });
    mockDb = { collection: mockCollection };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  it("updates allowed fields", async () => {
    const request = createRequest({
      site_title: "New Title",
      active_theme: "dark",
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "global" },
      { $set: { site_title: "New Title", active_theme: "dark" } },
    );
  });

  it("updates *Settings fields", async () => {
    const request = createRequest({
      expenseSettings: { currency: "EUR" },
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "global" },
      { $set: { expenseSettings: { currency: "EUR" } } },
    );
  });

  it("ignores unallowed fields", async () => {
    const request = createRequest({
      site_title: "New Title",
      dangerouslyChangeInternalState: true,
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "global" },
      { $set: { site_title: "New Title" } },
    );
  });

  it("returns 400 if no valid fields are provided", async () => {
    const request = createRequest({
      invalidField: "value",
    });

    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No valid fields to update");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("returns 400 if *Settings is not an object", async () => {
    const request = createRequest({
      maliciousSettings: "not-an-object",
    });

    const response = await PUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No valid fields to update");
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("partially updates and ignores invalid *Settings", async () => {
    const request = createRequest({
      site_title: "New Title",
      maliciousSettings: "not-an-object",
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: "global" },
      { $set: { site_title: "New Title" } },
    );
  });
});
