import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.data) {
            return ApiError("Invalid backup format", 400);
        }

        const db = await getDb();
        const results: Record<string, number> = {};

        // Restore system collection
        if (body.data.system && Array.isArray(body.data.system)) {
            await db.collection("system").deleteMany({});
            if (body.data.system.length > 0) {
                // Strip MongoDB _id to avoid conflicts
                const docs = body.data.system.map((d: Record<string, unknown>) => {
                    const { _id, ...rest } = d;
                    return { _id: _id || "global", ...rest };
                });
                await db.collection("system").insertMany(docs);
            }
            results.system = body.data.system.length;
        }

        // Restore content collection
        if (body.data.content && Array.isArray(body.data.content)) {
            await db.collection("content").deleteMany({});
            if (body.data.content.length > 0) {
                const docs = body.data.content.map((d: Record<string, unknown>) => {
                    const { _id: _unusedContent, ...rest } = d;
                    void _unusedContent;
                    return rest;
                });
                await db.collection("content").insertMany(docs);
            }
            results.content = body.data.content.length;
        }

        // Restore metrics collection
        if (body.data.metrics && Array.isArray(body.data.metrics)) {
            await db.collection("metrics").deleteMany({});
            if (body.data.metrics.length > 0) {
                const docs = body.data.metrics.map((d: Record<string, unknown>) => {
                    const { _id: _unusedMetric, ...rest } = d;
                    void _unusedMetric;
                    return rest;
                });
                await db.collection("metrics").insertMany(docs);
            }
            results.metrics = body.data.metrics.length;
        }

        return ApiSuccess({ success: true, restored: results });
    } catch (e: unknown) {
        console.error("POST /api/import failed:", e);
        const message = e instanceof Error ? e.message : "Import failed";
        return ApiError(message, 500);
    }
}
