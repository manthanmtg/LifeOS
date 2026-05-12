import "server-only";

import { getDb } from "@/lib/mongodb";

// In-memory cache variables
let cachedTieredVisits: Record<
  string,
  {
    admin: [number, number, number, number];
    public: [number, number, number, number];
  }
> | null = null;
let cacheExpiryTime = 0;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function getTieredVisits() {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedTieredVisits && now < cacheExpiryTime) {
    return cachedTieredVisits;
  }

  try {
    const db = await getDb();
    const metricsColl = db.collection("metrics");

    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // MongoDB Aggregation Pipeline
    const pipeline = [
      {
        $match: {
          action: { $in: ["page_view", "session_start"] },
          timestamp: { $gte: ninetyDaysAgo.toISOString() },
        },
      },
      {
        $project: {
          module: 1,
          is_admin: 1,
          // Calculate the exact age of the event in days
          daysOld: {
            $dateDiff: {
              startDate: { $dateFromString: { dateString: "$timestamp" } },
              endDate: new Date(now),
              unit: "day",
            },
          },
        },
      },
      {
        // Tag events into 4 tiers
        $addFields: {
          isTier1: { $lte: ["$daysOld", 7] },
          isTier2: {
            $and: [{ $gt: ["$daysOld", 7] }, { $lte: ["$daysOld", 30] }],
          },
          isTier3: {
            $and: [{ $gt: ["$daysOld", 30] }, { $lte: ["$daysOld", 60] }],
          },
          isTier4: {
            $and: [{ $gt: ["$daysOld", 60] }, { $lte: ["$daysOld", 90] }],
          },
        },
      },
      {
        // Group by module and is_admin
        $group: {
          _id: { module: "$module", is_admin: "$is_admin" },
          tier1Count: { $sum: { $cond: ["$isTier1", 1, 0] } },
          tier2Count: { $sum: { $cond: ["$isTier2", 1, 0] } },
          tier3Count: { $sum: { $cond: ["$isTier3", 1, 0] } },
          tier4Count: { $sum: { $cond: ["$isTier4", 1, 0] } },
        },
      },
    ];

    const results = await metricsColl.aggregate(pipeline).toArray();

    const output: Record<
      string,
      {
        admin: [number, number, number, number];
        public: [number, number, number, number];
      }
    > = {};

    for (const r of results) {
      const mod = r._id.module;
      if (!mod) continue;

      if (!output[mod]) {
        output[mod] = {
          admin: [0, 0, 0, 0],
          public: [0, 0, 0, 0],
        };
      }

      const isAdmin = r._id.is_admin ? "admin" : "public";
      output[mod][isAdmin] = [
        r.tier1Count || 0,
        r.tier2Count || 0,
        r.tier3Count || 0,
        r.tier4Count || 0,
      ];
    }

    // Update memory cache
    cachedTieredVisits = output;
    cacheExpiryTime = now + CACHE_DURATION_MS;

    return output;
  } catch (error) {
    console.error("Failed to aggregate tiered visits:", error);
    // If we fail but have stale cache, return stale rather than breaking UI
    if (cachedTieredVisits) return cachedTieredVisits;
    return {};
  }
}
