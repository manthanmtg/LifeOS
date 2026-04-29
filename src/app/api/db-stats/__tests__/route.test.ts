// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { getDb } from "@/lib/mongodb";

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

type MockCollectionConfig = {
  count?: number;
  docs?: unknown[];
  countError?: Error;
};

function createMockDb(collections: Record<string, MockCollectionConfig>) {
  const limitMocks: Record<string, ReturnType<typeof vi.fn>> = {};
  const collectionMocks: Record<
    string,
    { estimatedDocumentCount: ReturnType<typeof vi.fn> }
  > = {};

  const db = {
    databaseName: "lifeos-test",
    listCollections: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue(
        Object.keys(collections).map((name) => ({
          name,
        })),
      ),
    })),
    collection: vi.fn((name: string) => {
      const config = collections[name] ?? {};
      const limit = vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue(config.docs ?? []),
      }));
      limitMocks[name] = limit;

      const estimatedDocumentCount = config.countError
        ? vi.fn().mockRejectedValue(config.countError)
        : vi.fn().mockResolvedValue(config.count ?? 0);
      collectionMocks[name] = { estimatedDocumentCount };

      return {
        estimatedDocumentCount,
        find: vi.fn(() => ({
          limit,
        })),
      };
    }),
  };

  return { db, limitMocks, collectionMocks };
}

describe("/api/db-stats route", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns aggregate database and collection statistics", async () => {
    const contentDocs = [{ title: "Alpha" }, { title: "Beta" }];
    const contentSize =
      (contentDocs.reduce((sum, doc) => sum + JSON.stringify(doc).length, 0) /
        contentDocs.length) *
      3;
    const { db } = createMockDb({
      content: { count: 3, docs: contentDocs },
      metrics: { count: 0, docs: [] },
    });
    vi.mocked(getDb).mockResolvedValue(db as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        database: {
          name: "lifeos-test",
          collections: 2,
          documents: 3,
          dataSize: contentSize * 1.5,
          storageSize: contentSize * 1.5,
          avgObjSize: Math.round(contentSize / 3),
        },
        collections: [
          {
            name: "content",
            documentCount: 3,
            size: contentSize,
            avgObjSize: contentSize / 3,
            storageSize: contentSize * 1.5,
            indexSize: 0,
          },
          {
            name: "metrics",
            documentCount: 0,
            size: 0,
            avgObjSize: 0,
            storageSize: 0,
            indexSize: 0,
          },
        ],
        server: { version: "Atlas" },
        connection: { database: "lifeos-test" },
      },
    });
  });

  it("samples no more than ten documents per collection", async () => {
    const { db, limitMocks } = createMockDb({
      content: { count: 42, docs: [{ value: "sample" }] },
    });
    vi.mocked(getDb).mockResolvedValue(db as never);

    await GET();

    expect(limitMocks.content).toHaveBeenCalledWith(10);
  });

  it("uses the document count when fewer than ten documents are available", async () => {
    const { db, limitMocks } = createMockDb({
      content: { count: 4, docs: [{ value: 1 }] },
    });
    vi.mocked(getDb).mockResolvedValue(db as never);

    await GET();

    expect(limitMocks.content).toHaveBeenCalledWith(4);
  });

  it("falls back to zero stats for collections that fail individually", async () => {
    const { db } = createMockDb({
      content: { countError: new Error("stats unavailable") },
      system: { count: 1, docs: [{ config: true }] },
    });
    vi.mocked(getDb).mockResolvedValue(db as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.collections).toEqual([
      {
        name: "content",
        documentCount: 0,
        size: 0,
        avgObjSize: 0,
        storageSize: 0,
        indexSize: 0,
      },
      expect.objectContaining({
        name: "system",
        documentCount: 1,
      }),
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      "Error getting stats for content:",
      expect.any(Error),
    );
  });

  it("returns zero totals when the database has no collections", async () => {
    const { db } = createMockDb({});
    vi.mocked(getDb).mockResolvedValue(db as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        database: {
          collections: 0,
          documents: 0,
          dataSize: 0,
          storageSize: 0,
          avgObjSize: 0,
        },
        collections: [],
        limits: {
          usagePercent: 0,
          remaining: 512 * 1024 * 1024,
        },
      },
    });
  });

  it("keeps sampled-size estimates numeric when sampling returns no documents", async () => {
    const { db } = createMockDb({
      content: { count: 5, docs: [] },
    });
    vi.mocked(getDb).mockResolvedValue(db as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.collections[0]).toMatchObject({
      name: "content",
      documentCount: 5,
      size: 0,
      avgObjSize: 0,
      storageSize: 0,
    });
    expect(body.data.database).toMatchObject({
      documents: 5,
      dataSize: 0,
      storageSize: 0,
      avgObjSize: 0,
    });
  });

  it("returns a 500 api error when the database cannot be loaded", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("connection failed"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Failed to fetch database statistics",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "GET /api/db-stats failed:",
      expect.any(Error),
    );
  });
});
