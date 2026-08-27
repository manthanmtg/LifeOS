import "server-only";

import { MongoClient, ServerApiVersion } from "mongodb";

// Optimized options for pooling and resilience
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Recommended options for robust connection handling in Next.js
  maxPoolSize: 10, // Limit connections to prevent leaks
  minPoolSize: 1, // Keep at least one connection warm
  connectTimeoutMS: 5000, // Fail fast on initial connection
  serverSelectionTimeoutMS: 5000, // Fail fast if DB vanishes
  appName: "LifeOS-EMI-Tracker",
};

let client: MongoClient;
let cachedClientPromise: Promise<MongoClient> | undefined;

function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      const connectionPromise = client.connect().catch((err) => {
        if (globalWithMongo._mongoClientPromise === connectionPromise) {
          delete globalWithMongo._mongoClientPromise;
        }
        console.error("Failed to connect to MongoDB in development:", err);
        throw err;
      });
      globalWithMongo._mongoClientPromise = connectionPromise;
    }
    return globalWithMongo._mongoClientPromise;
  }

  // In production mode, it's best to not use a global variable.
  if (!cachedClientPromise) {
    client = new MongoClient(uri, options);
    const connectionPromise = client.connect().catch((err) => {
      if (cachedClientPromise === connectionPromise) {
        cachedClientPromise = undefined;
      }
      console.error("Failed to connect to MongoDB in production:", err);
      throw err;
    });
    cachedClientPromise = connectionPromise;
  }
  return cachedClientPromise;
}

/**
 * Returns a configured MongoDB Database instance for Life OS.
 * Defaults to the database specified in the connection string, or `lifeos`.
 */
export async function getDb(dbName?: string) {
  const promise = getClientPromise();

  try {
    const connectedClient = await promise;
    return connectedClient.db(dbName || "lifeos");
  } catch (error) {
    console.error("CRITICAL: Database connection failed in getDb:", error);
    // Throwing a standardized error for API routes to catch
    throw new Error("Database service is currently unavailable.");
  }
}

const clientPromise = {
  then: (...args: Parameters<Promise<MongoClient>["then"]>) =>
    getClientPromise().then(...args),
  catch: (...args: Parameters<Promise<MongoClient>["catch"]>) =>
    getClientPromise().catch(...args),
  finally: (...args: Parameters<Promise<MongoClient>["finally"]>) =>
    getClientPromise().finally(...args),
  [Symbol.toStringTag]: "Promise",
} as Promise<MongoClient>;

export default clientPromise;
