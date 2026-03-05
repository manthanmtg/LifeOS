import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { SchemaRegistry } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");
        const result = await contentColl.findOne({ _id: new ObjectId(id) });

        if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ data: result });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const body = await request.json();
        const { is_public, payload } = body;

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");

        const existing = await contentColl.findOne({ _id: new ObjectId(id) });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const schema = SchemaRegistry[existing.module_type];
        if (schema && payload) {
            const parsed = schema.safeParse(payload);
            if (!parsed.success) {
                return NextResponse.json(
                    { error: "Validation failed", details: parsed.error.format() },
                    { status: 400 }
                );
            }
        }

        const updateData: Partial<ContentDocument> = {
            updated_at: new Date().toISOString(),
        };
        if (is_public !== undefined) updateData.is_public = is_public;
        if (payload) updateData.payload = schema ? schema.parse(payload) : payload;

        await contentColl.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");

        const result = await contentColl.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
    }
}
