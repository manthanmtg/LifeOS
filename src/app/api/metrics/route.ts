import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { createHash } from "crypto";

export async function GET(req: NextRequest) {
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 86400000).toISOString();

    try {
        const db = await getDb();
        const metrics = await db.collection("metrics")
            .find({ timestamp: { $gte: since } })
            .sort({ timestamp: -1 })
            .limit(10000)
            .toArray();
        return ApiSuccess(metrics);
    } catch (err: unknown) {
        console.error("GET /api/metrics failed:", err);
        return ApiSuccess([]); // Graceful degradation for metrics
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const db = await getDb();

        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const ua = req.headers.get("user-agent") || "unknown";
        const sessionHash = createHash("sha256")
            .update(`${ip}-${ua}-${new Date().toISOString().slice(0, 10)}`)
            .digest("hex")
            .slice(0, 12);

        const event = {
            path: body.path || "/",
            module: body.module || "core",
            action: body.action || "view",
            label: body.label || null,
            value: body.value || null,
            metadata: body.metadata || {},
            referrer: body.referrer || null,
            device_type: body.device_type || "desktop",
            session_id: sessionHash,
            timestamp: new Date().toISOString(),
        };

        await db.collection("metrics").insertOne(event);
        return ApiSuccess({ success: true });
    } catch (err: unknown) {
        console.error("POST /api/metrics failed:", err);
        return ApiError("Failed to record metric", 500);
    }
}

