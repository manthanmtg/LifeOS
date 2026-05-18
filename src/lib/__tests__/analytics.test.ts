import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackEvent } from "../analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve({ ok: true }));
  });

  it("does nothing if window is undefined", async () => {
    const originalWindow = global.window;
    delete (global as { window?: Window | undefined }).window;

    await trackEvent({ action: "test" });
    expect(global.fetch).not.toHaveBeenCalled();

    global.window = originalWindow;
  });

  it("calls fetch with correct payload on desktop", async () => {
    // Mock window properties
    vi.stubGlobal("window", {
      innerWidth: 1200,
      location: { pathname: "/test", search: "?q=1" },
    });
    vi.stubGlobal("document", {
      referrer: "https://google.com",
    });

    await trackEvent({ action: "test_action", module: "test_module" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/metrics",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"device_type":"desktop"'),
      }),
    );

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string,
    );
    expect(body.action).toBe("test_action");
    expect(body.device_type).toBe("desktop");
    expect(body.path).toBe("/test?q=1");
  });

  it("detects mobile device type", async () => {
    vi.stubGlobal("window", {
      innerWidth: 500,
      location: { pathname: "/", search: "" },
    });

    await trackEvent({ action: "test" });

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]!.body as string,
    );
    expect(body.device_type).toBe("mobile");
  });

  it("uses computed path when event path is not provided", async () => {
    vi.stubGlobal("window", {
      innerWidth: 1024,
      location: { pathname: "/custom", search: "?a=1&b=2" },
    });
    vi.stubGlobal("document", {
      referrer: "",
    });

    await trackEvent({ action: "visit" });

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls.at(-1)?.[1]!.body as string,
    );
    expect(body.path).toBe("/custom?a=1&b=2");
  });

  it("uses provided path when event path is supplied", async () => {
    vi.stubGlobal("window", {
      innerWidth: 800,
      location: { pathname: "/wrong", search: "" },
    });
    vi.stubGlobal("document", {
      referrer: "https://example.com",
    });

    await trackEvent({ action: "visit", path: "/provided/path" });

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls.at(-1)?.[1]!.body as string,
    );
    expect(body.path).toBe("/provided/path");
    expect(body.referrer).toBe("https://example.com");
  });

  it("classifies tablet device type", async () => {
    vi.stubGlobal("window", {
      innerWidth: 900,
      location: { pathname: "/tablet", search: "" },
    });

    await trackEvent({ action: "touch" });

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls.at(-1)?.[1]!.body as string,
    );
    expect(body.device_type).toBe("tablet");
  });

  it("adds metadata and optional fields to payload", async () => {
    vi.stubGlobal("window", {
      innerWidth: 1100,
      location: { pathname: "/meta", search: "" },
    });

    await trackEvent({
      action: "submit",
      module: "dashboard",
      label: null,
      value: 42,
      metadata: { source: "unit-test" },
      is_admin: true,
    });

    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls.at(-1)?.[1]!.body as string,
    );
    expect(body.label).toBeNull();
    expect(body.value).toBe(42);
    expect(body.metadata).toEqual({ source: "unit-test" });
    expect(body.is_admin).toBe(true);
  });

  it("silently ignores fetch failures", async () => {
    vi.stubGlobal("window", {
      innerWidth: 1000,
      location: { pathname: "/error", search: "" },
    });
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network down"));

    await expect(trackEvent({ action: "offline" })).resolves.toBeUndefined();
  });
});
