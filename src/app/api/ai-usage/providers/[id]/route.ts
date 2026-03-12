import { getDb } from "@/lib/mongodb";
import { AiProviderConfigSchema } from "@/lib/schemas";
import { ObjectId } from "mongodb";
import { ApiSuccess, ApiError, ApiValidationError, ApiNotFound } from "@/lib/api-response";

function maskKey(key: string): string {
    if (key.length <= 8) return "****" + key.slice(-4);
    return key.slice(0, 7) + "..." + key.slice(-4);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

        const db = await getDb();
        const doc = await db.collection("ai_providers").findOne({ _id: new ObjectId(id) });
        if (!doc) return ApiNotFound();

        return ApiSuccess({ ...doc, admin_api_key: maskKey(doc.admin_api_key) });
    } catch (error) {
        console.error("GET /api/ai-usage/providers/[id] failed:", error);
        return ApiError("Failed to fetch provider", 500);
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

        const body = await request.json();
        const db = await getDb();
        const coll = db.collection("ai_providers");

        const existing = await coll.findOne({ _id: new ObjectId(id) });
        if (!existing) return ApiNotFound();

        // If api key field is masked (unchanged from frontend), keep the old one
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (body.name !== undefined) updateData.name = body.name;
        if (body.provider !== undefined) updateData.provider = body.provider;
        if (body.is_active !== undefined) updateData.is_active = body.is_active;
        if (body.admin_api_key !== undefined && body.admin_api_key.trim() && !body.admin_api_key.includes("...")) {
            updateData.admin_api_key = body.admin_api_key;
        }
        if (body.plan !== undefined) updateData.plan = body.plan || undefined;
        if (body.monthly_budget !== undefined) updateData.monthly_budget = body.monthly_budget || undefined;
        if (body.organization_name !== undefined) updateData.organization_name = body.organization_name || undefined;
        if (body.last_synced_at !== undefined) updateData.last_synced_at = body.last_synced_at;

        // Validate the merged result
        const merged = { ...existing, ...updateData };
        const parsed = AiProviderConfigSchema.safeParse({
            name: merged.name,
            provider: merged.provider,
            admin_api_key: merged.admin_api_key,
            is_active: merged.is_active,
            last_synced_at: merged.last_synced_at,
        });
        if (!parsed.success) return ApiValidationError(parsed.error.format());

        await coll.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        return ApiSuccess({ success: true });
    } catch (error) {
        console.error("PUT /api/ai-usage/providers/[id] failed:", error);
        return ApiError("Failed to update provider", 500);
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

        const db = await getDb();
        const result = await db.collection("ai_providers").deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return ApiNotFound();

        // Also delete synced usage entries for this provider
        await db.collection("content").deleteMany({
            module_type: "ai_usage",
            "payload.provider_config_id": id,
            "payload.synced": true,
        });

        return ApiSuccess({ success: true });
    } catch (error) {
        console.error("DELETE /api/ai-usage/providers/[id] failed:", error);
        return ApiError("Failed to delete provider", 500);
    }
}
