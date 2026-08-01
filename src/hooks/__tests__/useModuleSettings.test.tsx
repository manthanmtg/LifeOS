import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useModuleSettings, _resetSystemCache } from "../useModuleSettings";

describe("useModuleSettings", () => {
  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn();
    _resetSystemCache();
  });

  it("loads stored settings and merges them with defaults", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        data: {
          widgetSettings: {
            enabled: false,
          },
        },
      }),
    } as Response);

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        theme: "ocean",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      enabled: false,
      theme: "ocean",
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/system");
  });

  it("falls back to defaults when the server has no value for the key", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        data: {
          unrelatedSettings: {
            active: false,
          },
        },
      }),
    } as Response);

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        theme: "ocean",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      enabled: true,
      theme: "ocean",
    });
  });

  it("applies browser cache before server settings resolve, then reconciles to the server value", async () => {
    let resolveGet: (value: Response) => void = () => {};
    const getPromise = new Promise<Response>((resolve) => {
      resolveGet = resolve;
    });
    const browserCache = {
      read: vi.fn(() => ({ defaultCurrency: "INR" })),
      write: vi.fn(),
    };

    vi.mocked(global.fetch).mockImplementationOnce(() => getPromise);

    const { result } = renderHook(() =>
      useModuleSettings(
        "widgetSettings",
        {
          defaultCurrency: "USD",
          theme: "ocean",
        },
        browserCache,
      ),
    );

    await waitFor(() =>
      expect(result.current.settings.defaultCurrency).toBe("INR"),
    );
    expect(result.current.loaded).toBe(false);

    resolveGet(
      new Response(
        JSON.stringify({
          data: {
            widgetSettings: {
              defaultCurrency: "EUR",
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      defaultCurrency: "EUR",
      theme: "ocean",
    });
    expect(browserCache.write).toHaveBeenCalledWith({
      defaultCurrency: "EUR",
      theme: "ocean",
    });
  });

  it("resets a stale browser cache when the server succeeds without module settings", async () => {
    const browserCache = {
      read: vi.fn(() => ({ defaultCurrency: "INR" })),
      write: vi.fn(),
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    } as Response);

    const { result } = renderHook(() =>
      useModuleSettings(
        "widgetSettings",
        {
          defaultCurrency: "USD",
          theme: "ocean",
        },
        browserCache,
      ),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      defaultCurrency: "USD",
      theme: "ocean",
    });
    expect(browserCache.write).toHaveBeenCalledWith({
      defaultCurrency: "USD",
      theme: "ocean",
    });
  });

  it("retains browser cache when system revalidation fails", async () => {
    const browserCache = {
      read: vi.fn(() => ({ defaultCurrency: "INR" })),
      write: vi.fn(),
    };

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() =>
      useModuleSettings(
        "widgetSettings",
        {
          defaultCurrency: "USD",
          theme: "ocean",
        },
        browserCache,
      ),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      defaultCurrency: "INR",
      theme: "ocean",
    });
    expect(browserCache.write).not.toHaveBeenCalled();
  });

  it("dedupes initial system fetches across multiple hook instances", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        data: {
          widgetSettings: {
            mode: "dense",
          },
        },
      }),
    } as Response);

    const { result: first } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        mode: "default",
      }),
    );
    const { result: second } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        mode: "default",
      }),
    );

    await waitFor(() => expect(first.current.loaded).toBe(true));
    await waitFor(() => expect(second.current.loaded).toBe(true));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(first.current.settings).toEqual({ mode: "dense" });
    expect(second.current.settings).toEqual({ mode: "dense" });
  });

  it("reuses a valid cache on subsequent mounts within TTL", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        data: {
          widgetSettings: {
            enabled: false,
          },
        },
      }),
    } as Response);

    const { result: first } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
      }),
    );

    await waitFor(() => expect(first.current.loaded).toBe(true));

    const { result: second } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
      }),
    );

    await waitFor(() => expect(second.current.loaded).toBe(true));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(first.current.settings).toEqual({ enabled: false });
    expect(second.current.settings).toEqual({ enabled: false });
  });

  it("re-fetches system settings after cache TTL expires", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(0);

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            widgetSettings: {
              enabled: true,
            },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            widgetSettings: {
              enabled: false,
            },
          },
        }),
      } as Response);

    const { result: first } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: false,
      }),
    );

    await waitFor(() => expect(first.current.loaded).toBe(true));

    nowSpy.mockReturnValue(6000);

    const { result: second } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
      }),
    );

    await waitFor(() => expect(second.current.loaded).toBe(true));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(first.current.settings).toEqual({ enabled: true });
    expect(second.current.settings).toEqual({ enabled: false });

    nowSpy.mockRestore();
  });

  it("does not mutate other keys in the system response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        data: {
          widgetSettings: {
            enabled: false,
          },
          readingSettings: {
            autoPlay: true,
          },
        },
      }),
    } as Response);

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        speed: "fast",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      enabled: false,
      speed: "fast",
    });
  });

  it("marks the hook as loaded even when the initial fetch fails", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({ enabled: true });
  });

  it("optimistically updates settings, sends the merged payload, and clears saving state", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({ data: {} }),
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        theme: "ocean",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await expect(
        result.current.updateSettings({ theme: "forest" }),
      ).resolves.toBe(true);
    });

    expect(result.current.settings).toEqual({
      enabled: true,
      theme: "forest",
    });
    expect(result.current.error).toBeNull();
    expect(result.current.updateResult).toEqual({
      status: "success",
      message: "Settings saved",
    });
    expect(result.current.saving).toBe(true);
    expect(global.fetch).toHaveBeenLastCalledWith("/api/system", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgetSettings: {
          enabled: true,
          theme: "forest",
        },
      }),
    });

    await waitFor(() => expect(result.current.saving).toBe(false), {
      timeout: 1500,
    });
  });

  it("writes browser cache optimistically when settings change", async () => {
    const browserCache = {
      read: vi.fn(() => null),
      write: vi.fn(),
    };
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useModuleSettings(
        "widgetSettings",
        {
          defaultCurrency: "USD",
          theme: "ocean",
        },
        browserCache,
      ),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));
    browserCache.write.mockClear();

    let ok = true;
    await act(async () => {
      ok = await result.current.updateSettings({ defaultCurrency: "GBP" });
    });

    expect(result.current.settings).toEqual({
      defaultCurrency: "GBP",
      theme: "ocean",
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("Failed to save system settings: 500");
    expect(result.current.updateResult).toEqual({
      status: "error",
      message: "Failed to save settings",
    });
    expect(browserCache.write).toHaveBeenCalledWith({
      defaultCurrency: "GBP",
      theme: "ocean",
    });

    consoleSpy.mockRestore();
  });

  it("keeps settings optimistic and clears saving when save fails", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({ data: {} }),
      } as Response)
      .mockRejectedValueOnce(new Error("save failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        theme: "ocean",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await expect(
        result.current.updateSettings({ theme: "forest" }),
      ).resolves.toBe(false);
    });

    expect(result.current.settings).toEqual({
      enabled: true,
      theme: "forest",
    });
    expect(result.current.error).toBe("save failed");
    expect(result.current.updateResult.status).toBe("error");

    await waitFor(() => expect(result.current.saving).toBe(false), {
      timeout: 1500,
    });
    consoleSpy.mockRestore();
  });

  it("keeps optimistic state local before save completes", async () => {
    let resolvePut: (value: Response) => void = () => {};
    const putPromise = new Promise<Response>((resolve) => {
      resolvePut = resolve;
    });

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({ data: {} }),
      } as Response)
      .mockImplementationOnce(() => putPromise);

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      void result.current.updateSettings({ enabled: false });
    });

    expect(result.current.settings).toEqual({
      enabled: false,
    });
    expect(result.current.saving).toBe(true);

    resolvePut({ ok: true } as Response);
    await waitFor(() => expect(result.current.saving).toBe(false), {
      timeout: 1500,
    });
  });

  it("falls back to defaults when API returns missing data", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        mode: "compact",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      enabled: true,
      mode: "compact",
    });
  });

  it("falls back to defaults when system payload is malformed", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("invalid payload"));

    const { result } = renderHook(() =>
      useModuleSettings("widgetSettings", {
        enabled: true,
        theme: "ocean",
      }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings).toEqual({
      enabled: true,
      theme: "ocean",
    });
    expect(result.current.error).toBe("invalid payload");
    expect(result.current.saving).toBe(false);
  });
});
