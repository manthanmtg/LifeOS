import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";
import { ApiSuccess, ApiError } from "@/lib/api-response";

export async function POST(request: Request) {
    try {
        const { moduleKey } = await request.json();
        if (!moduleKey) return ApiError("Module key is required", 400);

        const db = await getDb();
        const systemColl = db.collection<SystemConfig>("system");

        await systemColl.updateOne(
            { _id: "global" },
            { $inc: { [`pageVisits.${moduleKey}`]: 1 } }
        );

        return ApiSuccess({ success: true });
    } catch (err: unknown) {
        console.error("POST /api/system/track-visit failed:", err);
        return ApiError("Failed to track visit", 500);
    }
}
