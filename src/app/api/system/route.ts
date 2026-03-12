import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";
import { ApiSuccess, ApiError } from "@/lib/api-response";

export async function GET() {
    try {
        const db = await getDb();
        const systemColl = db.collection<SystemConfig>("system");
        const result = await systemColl.findOne({ _id: "global" });

        if (!result) return ApiError("Not initialized", 404);

        return ApiSuccess(result);
    } catch (err: unknown) {
        console.error("GET /api/system failed:", err);
        return ApiError("Internal engine error", 500);
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        // E.g. { active_theme: "dracula", moduleRegistry: { ... } }

        const db = await getDb();
        const systemColl = db.collection<SystemConfig>("system");

        await systemColl.updateOne(
            { _id: "global" },
            { $set: body }
        );

        return ApiSuccess({ success: true });
    } catch (err: unknown) {
        console.error("PUT /api/system failed:", err);
        return ApiError("Failed to update system settings", 500);
    }
}
