/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH, PUT } from "../route";
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
  let mockDeleteOne: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    mockDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
    mockFindOne = vi.fn().mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      module_type: "blog_post",
      is_public: false,
      payload: {},
    });
    vi.mocked(getDb).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
        deleteOne: mockDeleteOne,
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

  it.each(["expense_space", "expense_space_entry"])(
    "rejects generic updates for domain-managed %s documents",
    async (moduleType) => {
      mockFindOne.mockResolvedValue({ module_type: moduleType });
      const payload =
        moduleType === "expense_space"
          ? {
              space_key: "11111111-1111-4111-8111-111111111111",
              name: "House Renovation",
              currency: "INR",
              number_format: "indian",
              status: "active",
              categories: [
                {
                  id: "22222222-2222-4222-8222-222222222222",
                  name: "Other",
                  is_active: true,
                  subcategories: [],
                },
              ],
            }
          : {
              space_key: "11111111-1111-4111-8111-111111111111",
              amount: 10,
              currency: "INR",
              description: "Valid expense",
              paid_to: "Supplier",
              category_id: "22222222-2222-4222-8222-222222222222",
              date: "2026-08-19",
              tags: [],
            };

      const response = await PUT(createJsonRequest({ payload }), {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: expect.stringMatching(/dedicated expense-spaces API/i),
      });
      expect(mockUpdateOne).not.toHaveBeenCalled();
    },
  );

  it.each(["expense_space", "expense_space_entry"])(
    "rejects generic patches for domain-managed %s documents",
    async (moduleType) => {
      mockFindOne.mockResolvedValue({ module_type: moduleType });

      const response = await PATCH(
        createJsonRequest({ is_public: true }, "PATCH"),
        { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: expect.stringMatching(/dedicated expense-spaces API/i),
      });
      expect(mockUpdateOne).not.toHaveBeenCalled();
    },
  );

  it.each(["expense_space", "expense_space_entry"])(
    "rejects generic deletes for domain-managed %s documents",
    async (moduleType) => {
      mockFindOne.mockResolvedValue({ module_type: moduleType });

      const response = await DELETE(
        new Request("http://localhost/api/content/507f1f77bcf86cd799439011", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) },
      );

      expect(response.status).toBe(400);
      expect(mockDeleteOne).not.toHaveBeenCalled();
    },
  );
});
