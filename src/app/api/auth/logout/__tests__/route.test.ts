// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

function getSetCookieHeader(response: Response) {
  const header = response.headers.get("set-cookie");
  expect(header).toBeTruthy();
  return header ?? "";
}

describe("POST /api/auth/logout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a success response", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("clears the auth cookie value", async () => {
    const response = await POST();

    expect(response.cookies.get("lifeos_token")?.value).toBe("");
  });

  it("expires the auth cookie immediately", async () => {
    const response = await POST();
    const setCookie = getSetCookieHeader(response);

    expect(setCookie).toContain("lifeos_token=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });

  it("uses the app-wide cookie path and browser protections", async () => {
    const response = await POST();
    const setCookie = getSetCookieHeader(response);

    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("marks the cleared cookie secure in production only", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const productionResponse = await POST();
    expect(getSetCookieHeader(productionResponse)).toContain("Secure");

    vi.stubEnv("NODE_ENV", "test");

    const testResponse = await POST();
    expect(getSetCookieHeader(testResponse)).not.toContain("Secure");
  });
});
