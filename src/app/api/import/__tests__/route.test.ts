import { describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import { getDb } from "@/lib/mongodb";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

describe("POST /api/import", () => {
  it("rejects malformed JSON as an invalid backup without touching the database", async () => {
    const request = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: "{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Invalid backup format",
    });
    expect(response.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
});
