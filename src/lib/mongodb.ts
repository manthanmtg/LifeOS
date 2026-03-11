import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

// Optimized options for pooling and resilience
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Recommended options for robust connection handling in Next.js
  maxPoolSize: 10, // Limit connections to prevent leaks
  minPoolSize: 1,  // Keep at least one connection warm
  connectTimeoutMS: 5000, // Fail fast on initial connection
  serverSelectionTimeoutMS: 5000, // Fail fast if DB vanishes
  appName: "LifeOS-EMI-Tracker",
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch(err => {
      console.error("Failed to connect to MongoDB in development:", err);
      throw err;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch(err => {
    console.error("Failed to connect to MongoDB in production:", err);
    throw err;
  });
}

/**
 * Returns a configured MongoDB Database instance for Life OS.
 * Defaults to the database specified in the connection string, or `lifeos`.
 */
export async function getDb(dbName?: string) {
  try {
    const connectedClient = await clientPromise;
    return connectedClient.db(dbName || "lifeos");
  } catch (error) {
    console.error("CRITICAL: Database connection failed in getDb:", error);
    // Throwing a standardized error for API routes to catch
    throw new Error("Database service is currently unavailable.");
  }
}

export default clientPromise;
