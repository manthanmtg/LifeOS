import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { SchemaRegistry } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const module_type = searchParams.get("module_type");
        const is_public = searchParams.get("is_public");

        const query: Record<string, any> = {};
        if (module_type) query.module_type = module_type;
        if (is_public !== null) query.is_public = is_public === "true";

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");
        const results = await contentColl.find(query).sort({ created_at: -1 }).toArray();

        return NextResponse.json({ data: results });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { module_type, is_public, payload } = body;

        if (!module_type || module_type === "") {
            return NextResponse.json({ error: "module_type is required" }, { status: 400 });
        }

        // Validate using Zod schema if available
        const schema = SchemaRegistry[module_type];
        if (schema) {
            const parsed = schema.safeParse(payload);
            if (!parsed.success) {
                return NextResponse.json(
                    { error: "Validation failed", details: parsed.error.format() },
                    { status: 400 }
                );
            }
        }

        const doc: Omit<ContentDocument, "_id"> = {
            module_type,
            is_public: is_public ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            payload: schema ? schema.parse(payload) : payload,
        };

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");
        const result = await contentColl.insertOne(doc);

        return NextResponse.json({ success: true, insertedId: result.insertedId }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
    }
}
