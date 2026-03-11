import { getDb } from "@/lib/mongodb";
import { SchemaRegistry } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";
import { ObjectId } from "mongodb";
import { ApiSuccess, ApiError, ApiValidationError, ApiNotFound } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) {
            return ApiError("Invalid ID", 400);
        }

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");
        const result = await contentColl.findOne({ _id: new ObjectId(id) });

        if (!result) return ApiNotFound();
        return ApiSuccess(result);
    } catch (error) {
        console.error("GET /api/content/[id] failed:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch content";
        return ApiError(message, 500);
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) {
            return ApiError("Invalid ID", 400);
        }

        const body = await request.json();
        const { is_public, payload } = body;

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");

        const existing = await contentColl.findOne({ _id: new ObjectId(id) });
        if (!existing) return ApiNotFound();

        const schema = SchemaRegistry[existing.module_type];
        if (schema && payload) {
            const parsed = schema.safeParse(payload);
            if (!parsed.success) {
                return ApiValidationError(parsed.error.format());
            }
        }

        const updateData: Partial<ContentDocument> = {
            updated_at: new Date().toISOString(),
        };
        if (is_public !== undefined) updateData.is_public = is_public;
        if (payload) updateData.payload = schema ? schema.parse(payload) : payload;

        await contentColl.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

        return ApiSuccess({ success: true });
    } catch (error) {
        console.error("PUT /api/content/[id] failed:", error);
        const message = error instanceof Error ? error.message : "Failed to update content";
        return ApiError(message, 500);
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) {
            return ApiError("Invalid ID", 400);
        }

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");

        const result = await contentColl.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return ApiNotFound();

        return ApiSuccess({ success: true });
    } catch (error) {
        console.error("DELETE /api/content/[id] failed:", error);
        const message = error instanceof Error ? error.message : "Failed to delete content";
        return ApiError(message, 500);
    }
}
