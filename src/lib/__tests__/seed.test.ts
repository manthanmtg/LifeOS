/** @vitest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/registry", () => ({
  moduleRegistry: {
    expenses: { defaultPublic: true },
    blog: { defaultPublic: false },
  },
}));

describe("ensureSystemConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function createDbMocks() {
    const findOne = vi.fn();
    const insertOne = vi.fn();
    const updateOne = vi.fn();
    const contentCreateIndex = vi.fn();
    const metricsCreateIndex = vi.fn();

    const systemCollection = {
      findOne,
      insertOne,
      updateOne,
    };

    const db = {
      collection: vi.fn((name: string) => {
        if (name === "system") {
          return systemCollection;
        }

        if (name === "content") {
          return { createIndex: contentCreateIndex };
        }

        if (name === "metrics") {
          return { createIndex: metricsCreateIndex };
        }

        throw new Error(`Unexpected collection: ${name}`);
      }),
    };

    return {
      db,
      findOne,
      insertOne,
      updateOne,
      contentCreateIndex,
      metricsCreateIndex,
    };
  }

  it("creates the default global config when it does not exist", async () => {
    const { getDb } = await import("../mongodb");
    const { ensureSystemConfig } = await import("../seed");
    const mocks = createDbMocks();

    mocks.findOne.mockResolvedValue(null);
    vi.mocked(getDb).mockResolvedValue(mocks.db as any);

    await ensureSystemConfig();

    expect(mocks.findOne).toHaveBeenCalledWith({ _id: "global" });
    expect(mocks.insertOne).toHaveBeenCalledWith({
      _id: "global",
      site_title: "Life OS",
      active_theme: "one-dark",
      bio: "Welcome to my Life OS instance.",
      moduleRegistry: {
        expenses: { enabled: true, isPublic: true },
        blog: { enabled: true, isPublic: false },
      },
    });
  });

  it("backfills newly registered modules into an existing config", async () => {
    const { getDb } = await import("../mongodb");
    const { ensureSystemConfig } = await import("../seed");
    const mocks = createDbMocks();

    mocks.findOne.mockResolvedValue({
      _id: "global",
      moduleRegistry: {
        expenses: { enabled: true, isPublic: true },
      },
    });
    vi.mocked(getDb).mockResolvedValue(mocks.db as any);

    await ensureSystemConfig();

    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: "global" },
      {
        $set: {
          moduleRegistry: {
            expenses: { enabled: true, isPublic: true },
            blog: { enabled: true, isPublic: false },
          },
        },
      },
    );
  });

  it("does not update the registry when all modules are already present", async () => {
    const { getDb } = await import("../mongodb");
    const { ensureSystemConfig } = await import("../seed");
    const mocks = createDbMocks();

    mocks.findOne.mockResolvedValue({
      _id: "global",
      moduleRegistry: {
        expenses: { enabled: true, isPublic: true },
        blog: { enabled: false, isPublic: false },
      },
    });
    vi.mocked(getDb).mockResolvedValue(mocks.db as any);

    await ensureSystemConfig();

    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("creates the expected query indexes on content and metrics", async () => {
    const { getDb } = await import("../mongodb");
    const { ensureSystemConfig } = await import("../seed");
    const mocks = createDbMocks();

    mocks.findOne.mockResolvedValue({
      _id: "global",
      moduleRegistry: {},
    });
    vi.mocked(getDb).mockResolvedValue(mocks.db as any);

    await ensureSystemConfig();

    expect(mocks.contentCreateIndex).toHaveBeenCalledTimes(3);
    expect(mocks.contentCreateIndex).toHaveBeenNthCalledWith(1, {
      module_type: 1,
    });
    expect(mocks.contentCreateIndex).toHaveBeenNthCalledWith(2, {
      created_at: -1,
    });
    expect(mocks.contentCreateIndex).toHaveBeenNthCalledWith(3, {
      module_type: 1,
      is_public: 1,
    });
    expect(mocks.metricsCreateIndex).toHaveBeenCalledTimes(2);
    expect(mocks.metricsCreateIndex).toHaveBeenNthCalledWith(1, {
      timestamp: -1,
    });
    expect(mocks.metricsCreateIndex).toHaveBeenNthCalledWith(2, {
      path: 1,
      timestamp: -1,
    });
  });

  it("swallows initialization errors after logging them", async () => {
    const { getDb } = await import("../mongodb");
    const { ensureSystemConfig } = await import("../seed");
    const mocks = createDbMocks();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failure = new Error("db unavailable");

    mocks.findOne.mockRejectedValue(failure);
    vi.mocked(getDb).mockResolvedValue(mocks.db as any);

    await expect(ensureSystemConfig()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[Seed] Could not initialize system config:",
      failure,
    );

    consoleError.mockRestore();
  });
});
