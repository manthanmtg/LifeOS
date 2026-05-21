import { beforeEach, describe, expect, it, vi } from "vitest";

import manifest, { dynamic } from "../manifest";
import { getDb } from "@/lib/mongodb";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

const getDbMock = vi.mocked(getDb);

function mockSystemConfig(config: Record<string, unknown> | null) {
  const findOne = vi.fn().mockResolvedValue(config);
  getDbMock.mockResolvedValue({
    collection: vi.fn(() => ({ findOne })),
  } as never);

  return { findOne };
}

describe("manifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opts into dynamic rendering", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("returns the default manifest when no system config exists", async () => {
    mockSystemConfig(null);

    await expect(manifest()).resolves.toMatchObject({
      name: "Life OS",
      short_name: "Life OS",
      description: "Personal portfolio and life management system.",
      start_url: "/",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
    });
  });

  it("uses the configured site title and icon when present", async () => {
    mockSystemConfig({
      _id: "global",
      site_title: "Manthan's OS",
      site_icon: "/brand/icon.png",
    });

    const result = await manifest();

    expect(result.name).toBe("Manthan's OS");
    expect(result.short_name).toBe("Manthan's OS");
    expect(result.icons).toEqual([
      { src: "/brand/icon.png", sizes: "any", type: "image/x-icon" },
      { src: "/brand/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon.png", sizes: "512x512", type: "image/png" },
    ]);
  });

  it("keeps the default icon when only a custom title is configured", async () => {
    mockSystemConfig({
      _id: "global",
      site_title: "Personal Command Center",
    });

    const result = await manifest();

    expect(result.name).toBe("Personal Command Center");
    expect(result.icons?.map((icon) => icon.src)).toEqual([
      "/favicon.ico",
      "/favicon.ico",
      "/favicon.ico",
    ]);
  });

  it("queries the global system config document", async () => {
    const { findOne } = mockSystemConfig(null);

    await manifest();

    expect(findOne).toHaveBeenCalledWith({ _id: "global" });
  });

  it("falls back to defaults when the config lookup fails", async () => {
    const error = new Error("database unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    getDbMock.mockRejectedValue(error);

    await expect(manifest()).resolves.toMatchObject({
      name: "Life OS",
      short_name: "Life OS",
      icons: expect.arrayContaining([
        expect.objectContaining({ src: "/favicon.ico" }),
      ]),
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to fetch manifest config:",
      error,
    );

    consoleError.mockRestore();
  });
});
