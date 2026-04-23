/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MongoClient } from "mongodb";

// Mock mongodb module
vi.mock("mongodb", () => {
  const mClient = {
    connect: vi.fn().mockImplementation(async () => mClient),
    db: vi.fn().mockReturnValue("mock_db"),
  };
  return {
    MongoClient: vi.fn().mockImplementation(function (this: any) {
      return mClient;
    }),
    ServerApiVersion: { v1: "1" },
  };
});

describe("mongodb.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("throws an error if MONGODB_URI is not defined", async () => {
    delete process.env.MONGODB_URI;
    await expect(async () => {
      await import("../mongodb");
    }).rejects.toThrow('Invalid/Missing environment variable: "MONGODB_URI"');
  });

  it("connects to mongodb successfully in development", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    (process.env as any).NODE_ENV = "development";
    // Ensure we don't have a cached global from another test
    delete (global as any)._mongoClientPromise;

    const { getDb } = await import("../mongodb");
    const db = await getDb();

    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(db).toBe("mock_db");
  });

  it("connects to mongodb successfully in production", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    (process.env as any).NODE_ENV = "production";

    const { getDb } = await import("../mongodb");
    const db = await getDb("testdb");

    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(db).toBe("mock_db");
  });

  it("uses global client in development to avoid multiple connections", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    (process.env as any).NODE_ENV = "development";

    const globalWithMongo = global as any;
    const mClient = { db: vi.fn().mockReturnValue("mock_global_db") };
    const mockPromise = Promise.resolve(mClient);
    globalWithMongo._mongoClientPromise = mockPromise;

    const { default: clientPromise, getDb } = await import("../mongodb");

    expect(clientPromise).toBe(mockPromise);
    expect(MongoClient).not.toHaveBeenCalled();

    const db = await getDb();
    expect(db).toBe("mock_global_db");

    delete globalWithMongo._mongoClientPromise;
  });

  it("throws a standardized error if connection fails in getDb", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    (process.env as any).NODE_ENV = "production";

    // override the mocked connect to reject
    const mClient = {
      connect: vi.fn().mockRejectedValue(new Error("connection failed")),
      db: vi.fn(),
    };
    (MongoClient as any).mockImplementationOnce(function (this: any) {
      return mClient;
    });

    const { getDb } = await import("../mongodb");
    await expect(getDb()).rejects.toThrow(
      "Database service is currently unavailable.",
    );
  });
});
