// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "@/lib/auth";

describe("proxy middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects logged-in users from / to /admin", async () => {
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });
    const request = new NextRequest("http://localhost/?foo=1", {
      headers: {
        cookie: "lifeos_token=valid-token",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin");
    expect(vi.mocked(verifyToken)).toHaveBeenCalledWith("valid-token");
  });

  it("keeps / public path when public=1 is requested", async () => {
    const request = new NextRequest("http://localhost/?public=1");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirects logged-in users away from /admin/login", async () => {
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });
    const request = new NextRequest("http://localhost/admin/login", {
      headers: {
        cookie: "lifeos_token=valid-token",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin");
  });

  it("redirects unauthenticated /admin access to login", async () => {
    const request = new NextRequest("http://localhost/admin/settings");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("allows authenticated /admin access", async () => {
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });
    const request = new NextRequest("http://localhost/admin/settings", {
      headers: {
        cookie: "lifeos_token=valid-token",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("returns unauthorized for protected API route without token", async () => {
    const request = new NextRequest("http://localhost/api/system");
    const response = await proxy(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("protects notification API routes", async () => {
    const request = new NextRequest(
      "http://localhost/api/notifications/overview",
    );
    const response = await proxy(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns unauthorized for protected API route with invalid token", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/system", {
      headers: {
        cookie: "lifeos_token=bad-token",
      },
    });
    const response = await proxy(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(verifyToken)).toHaveBeenCalledWith("bad-token");
  });

  it("does not protect GET requests to public content", async () => {
    const request = new NextRequest("http://localhost/api/content?module_type=blog_post");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("protects POST requests to content API routes", async () => {
    const request = new NextRequest("http://localhost/api/content", {
      method: "POST",
      headers: {
        cookie: "lifeos_token=valid-token",
        origin: "http://localhost",
      },
    });
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("requires same-origin headers for non-GET API requests", async () => {
    const request = new NextRequest("http://localhost/api/metrics", {
      method: "POST",
      headers: {
        cookie: "lifeos_token=valid-token",
        origin: "https://evil.example.com",
      },
    });
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });

    const response = await proxy(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("permits non-GET API requests with matching origin", async () => {
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });
    const request = new NextRequest("http://localhost/api/widgets/summary", {
      method: "POST",
      headers: {
        cookie: "lifeos_token=valid-token",
        origin: "http://localhost",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("rejects non-GET API requests with missing origin", async () => {
    const request = new NextRequest("http://localhost/api/metrics", {
      method: "PATCH",
      headers: {
        cookie: "lifeos_token=valid-token",
      },
    });
    vi.mocked(verifyToken).mockResolvedValue({ role: "admin" });

    const response = await proxy(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
  });
});
