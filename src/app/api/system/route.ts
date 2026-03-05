import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/types";

export async function GET() {
    try {
        const db = await getDb();
        const systemColl = db.collection<SystemConfig>("system");
        const result = await systemColl.findOne({ _id: "global" });

        if (!result) return NextResponse.json({ error: "Not initialized" }, { status: 404 });

        return NextResponse.json({ data: result });
    } catch (error) {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
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

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
