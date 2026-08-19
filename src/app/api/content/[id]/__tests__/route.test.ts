/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, PUT } from "../route";
import { getDb } from "@/lib/mongodb";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

function createJsonRequest(body: unknown, method: "PATCH" | "PUT" = "PUT") {
  return new Request("http://localhost/api/content/507f1f77bcf86cd799439011", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/content/[id] route", () => {
  let mockFindOne: any;
  let mockUpdateOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn().mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      module_type: "blog_post",
      is_public: false,
      payload: {},
    });
    mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      }),
    } as any);
  });

  it("rejects non-boolean public visibility before updating content", async () => {
    const response = await PUT(createJsonRequest({ is_public: "true" }), {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "is_public must be a boolean",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("patches only supplied payload fields after validating the merged payload", async () => {
    mockFindOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      module_type: "health_profile",
      is_public: false,
      payload: {
        name: "Cookie",
        type: "pet",
        blood_group: "unknown",
        profile_pic: {
          data: "large-base64-profile-picture",
          content_type: "image/jpeg",
        },
      },
    });

    const response = await PATCH(
      createJsonRequest({ payload: { vaccinations: [] } }, "PATCH"),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) },
    );

    expect(response.status).toBe(200);
    expect(mockUpdateOne).toHaveBeenCalledOnce();
    const update = mockUpdateOne.mock.calls[0][1];
    expect(update).toEqual({
      $set: {
        "payload.vaccinations": [],
        updated_at: expect.any(String),
      },
    });
    expect(update.$set).not.toHaveProperty("payload");
    expect(update.$set).not.toHaveProperty("payload.profile_pic");
  });

  it("rejects payload field names that could alter MongoDB update paths", async () => {
    mockFindOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      module_type: "calculator_profile",
      is_public: false,
      payload: {
        enabledCategories: {},
        enabledCalculators: {},
      },
    });

    const response = await PATCH(
      createJsonRequest(
        { payload: { "enabledCategories.admin": true } },
        "PATCH",
      ),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Invalid payload field: enabledCategories.admin",
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it.each([
    ["an array payload", { payload: [] }, "payload must be an object"],
    [
      "an unknown payload key",
      { payload: { unknown: true } },
      "Unknown payload field: unknown",
    ],
    ["an empty patch", {}, "Patch must include is_public or payload"],
    ["an invalid merged payload", { payload: { name: "" } }, undefined],
  ])("rejects %s", async (_label, body, expectedError) => {
    mockFindOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      module_type: "health_profile",
      is_public: false,
      payload: {
        name: "Cookie",
        type: "pet",
        blood_group: "unknown",
      },
    });

    const response = await PATCH(createJsonRequest(body, "PATCH"), {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(400);
    if (expectedError) {
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: expectedError,
      });
    }
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});
