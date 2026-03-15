import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { createHash } from "crypto";

export async function GET(req: NextRequest) {
    const rawDays = parseInt(req.nextUrl.searchParams.get("days") || "30");
    const days = Math.min(Math.max(isNaN(rawDays) ? 30 : rawDays, 1), 365);
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

        const safeStr = (v: unknown, fallback: string, maxLen = 500): string => {
            if (typeof v !== "string") return fallback;
            return v.slice(0, maxLen);
        };

        const allowedDeviceTypes = ["mobile", "tablet", "desktop", "unknown"];
        const deviceType = allowedDeviceTypes.includes(body.device_type) ? body.device_type : "desktop";

        const event = {
            path: safeStr(body.path, "/", 200),
            module: safeStr(body.module, "core", 100),
            action: safeStr(body.action, "view", 50),
            label: typeof body.label === "string" ? body.label.slice(0, 200) : null,
            value: typeof body.value === "number" ? body.value : null,
            metadata: typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata)
                ? JSON.parse(JSON.stringify(body.metadata).slice(0, 2000))
                : {},
            referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
            device_type: deviceType,
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

