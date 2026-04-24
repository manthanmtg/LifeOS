// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import { signToken } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  signToken: vi.fn(),
}));

// Helper to create a Request object
function createRequest(body: unknown, ip: string = "127.0.0.1") {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_PASSWORD", "test-password");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 200 and sets cookie on successful login", async () => {
    vi.mocked(signToken).mockResolvedValue("mocked-token");
    const request = createRequest({ password: "test-password" }, "ip-success");

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });

    // Check if signToken was called
    expect(signToken).toHaveBeenCalledWith({ role: "admin" });

    // Check if cookie was set
    // NextResponse.json returns a Response object that we can check cookies on in some environments
    // But since we are mocking/using NextResponse from next/server, let's see what it provides
    expect(response.cookies.get("lifeos_token")).toBeDefined();
    expect(response.cookies.get("lifeos_token")?.value).toBe("mocked-token");
  });

  it("returns 401 on invalid password", async () => {
    const request = createRequest({ password: "wrong-password" }, "ip-wrong");

    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid password");
  });

  it("returns 500 if ADMIN_PASSWORD is not set", async () => {
    delete process.env.ADMIN_PASSWORD;
    const request = createRequest({ password: "test-password" }, "ip-no-env");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");

    consoleSpy.mockRestore();
  });

  it("returns 400 if password is not a string", async () => {
    const request = createRequest({ password: 123 }, "ip-not-string");

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Bad request");
  });

  it("returns 400 on bad request (invalid JSON)", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: "invalid-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Bad request");
  });

  it("implements rate limiting after 5 failed attempts", async () => {
    const ip = "ip-rate-limit";
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const req = createRequest({ password: "wrong" }, ip);
      const res = await POST(req);
      expect(res.status).toBe(401);
    }

    // 6th attempt should be rate limited
    const req6 = createRequest({ password: "test-password" }, ip);
    const res6 = await POST(req6);

    expect(res6.status).toBe(429);
    const body = await res6.json();
    expect(body.error).toContain("Too many login attempts");
  });

  it("resets rate limit after lockout period", async () => {
    const ip = "ip-rate-limit-reset";
    vi.useFakeTimers();

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await POST(createRequest({ password: "wrong" }, ip));
    }

    // Should be rate limited
    const resLimited = await POST(
      createRequest({ password: "test-password" }, ip),
    );
    expect(resLimited.status).toBe(429);

    // Advance time by 16 minutes (LOCKOUT_TIME is 15 mins)
    vi.advanceTimersByTime(16 * 60 * 1000);

    // Should be allowed now
    vi.mocked(signToken).mockResolvedValue("mocked-token");
    const resOk = await POST(createRequest({ password: "test-password" }, ip));
    expect(resOk.status).toBe(200);

    vi.useRealTimers();
  });

  it("clears failed attempts on successful login", async () => {
    const ip = "ip-clear-attempts";

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await POST(createRequest({ password: "wrong" }, ip));
    }

    // Successful login
    vi.mocked(signToken).mockResolvedValue("mocked-token");
    await POST(createRequest({ password: "test-password" }, ip));

    // Another 3 failed attempts - should NOT be rate limited yet because it was cleared
    for (let i = 0; i < 3; i++) {
      const res = await POST(createRequest({ password: "wrong" }, ip));
      expect(res.status).toBe(401);
    }

    // Total failed since last success is now 3.
    // 2 more failed should reach limit.
    await POST(createRequest({ password: "wrong" }, ip));
    await POST(createRequest({ password: "wrong" }, ip));

    const resLimited = await POST(createRequest({ password: "wrong" }, ip));
    expect(resLimited.status).toBe(429);
  });
});
