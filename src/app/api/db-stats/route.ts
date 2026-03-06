import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ApiError } from "@/lib/api-response";

export async function GET() {
    try {
        const db = await getDb();

        // Get list of collections - this works on all tiers
        const collections = await db.listCollections().toArray();
        console.log("Found collections:", collections.map(c => c.name));

        // Get basic collection stats with estimated sizes
        const collectionStats = await Promise.all(
            collections.map(async (col) => {
                const collection = db.collection(col.name);
                try {
                    // estimatedDocumentCount works on all Atlas tiers
                    const documentCount = await collection.estimatedDocumentCount();

                    // Calculate size by sampling documents
                    let totalSize = 0;
                    if (documentCount > 0) {
                        const sampleSize = Math.min(documentCount, 10);
                        const sampleDocs = await collection.find({}).limit(sampleSize).toArray();
                        const avgDocSize = sampleDocs.reduce((acc, doc) => acc + JSON.stringify(doc).length, 0) / sampleDocs.length;
                        totalSize = avgDocSize * documentCount;
                    }

                    return {
                        name: col.name,
                        documentCount,
                        size: totalSize,
                        avgObjSize: documentCount > 0 ? totalSize / documentCount : 0,
                        storageSize: totalSize * 1.5, // Estimated with overhead
                        indexSize: 0,
                    };
                } catch (err) {
                    console.log(`Error getting stats for ${col.name}:`, err);
                    return {
                        name: col.name,
                        documentCount: 0,
                        size: 0,
                        avgObjSize: 0,
                        storageSize: 0,
                        indexSize: 0,
                    };
                }
            })
        );

        // Calculate totals
        const totalDocuments = collectionStats.reduce((sum, col) => sum + col.documentCount, 0);
        const totalSize = collectionStats.reduce((sum, col) => sum + col.size, 0);
        const totalStorage = collectionStats.reduce((sum, col) => sum + col.storageSize, 0);

        // Atlas M0 = 512MB limit
        const estimatedLimit = 512 * 1024 * 1024;
        const usagePercent = totalStorage > 0 ? (totalStorage / estimatedLimit) * 100 : 0;

        return NextResponse.json({
            success: true,
            data: {
                database: {
                    name: db.databaseName,
                    collections: collectionStats.length,
                    documents: totalDocuments,
                    dataSize: totalStorage,
                    storageSize: totalStorage,
                    indexSize: 0,
                    avgObjSize: totalDocuments > 0 ? Math.round(totalSize / totalDocuments) : 0,
                },
                collections: collectionStats,
                server: {
                    version: "Atlas",
                },
                connection: {
                    database: db.databaseName,
                },
                limits: {
                    estimated: estimatedLimit,
                    usagePercent: Math.round(usagePercent * 10) / 10 || 0,
                    remaining: Math.max(0, estimatedLimit - totalStorage),
                },
            },
        });
    } catch (err: unknown) {
        console.error("GET /api/db-stats failed:", err);
        return ApiError("Failed to fetch database statistics", 500);
    }
}
