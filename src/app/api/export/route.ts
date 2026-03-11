import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ApiError } from "@/lib/api-response";

export async function GET() {
    try {
        const db = await getDb();
        const system = await db.collection("system").find({}).toArray();
        const content = await db.collection("content").find({}).toArray();
        const metrics = await db.collection("metrics").find({}).toArray();

        const backup = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            data: { system, content, metrics },
        };

        return new NextResponse(JSON.stringify(backup, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="lifeos-backup-${new Date().toISOString().split("T")[0]}.json"`,
            },
        });
    } catch (err: unknown) {
        console.error("GET /api/export failed:", err);
        return ApiError("Export failed", 500);
    }
}
