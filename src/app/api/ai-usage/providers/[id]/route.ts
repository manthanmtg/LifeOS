import { getDb } from "@/lib/mongodb";
import { AiProviderConfigSchema } from "@/lib/schemas";
import { ObjectId } from "mongodb";
import {
  ApiSuccess,
  ApiError,
  ApiValidationError,
  ApiNotFound,
} from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

function maskKey(key: string): string {
  if (key.length <= 8) return "****" + key.slice(-4);
  return key.slice(0, 7) + "..." + key.slice(-4);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const id = (await params).id;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const db = await getDb();
    const doc = await db
      .collection("ai_providers")
      .findOne({ _id: new ObjectId(id) });
    if (!doc) return ApiNotFound();

    return ApiSuccess({ ...doc, admin_api_key: maskKey(doc.admin_api_key) });
  } catch (error) {
    console.error("GET /api/ai-usage/providers/[id] failed:", error);
    return ApiError("Failed to fetch provider", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const id = (await params).id;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return ApiError("Bad request", 400);
    }

    const bodyObj = body as Record<string, unknown>;
    const db = await getDb();
    const coll = db.collection("ai_providers");

    const existing = await coll.findOne({ _id: new ObjectId(id) });
    if (!existing) return ApiNotFound();

    // If api key field is masked (unchanged from frontend), keep the old one
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (bodyObj.name !== undefined) updateData.name = bodyObj.name;
    if (bodyObj.provider !== undefined) updateData.provider = bodyObj.provider;
    if (bodyObj.is_active !== undefined)
      updateData.is_active = bodyObj.is_active;
    if (
      typeof bodyObj.admin_api_key === "string" &&
      bodyObj.admin_api_key.trim() &&
      !bodyObj.admin_api_key.includes("...")
    ) {
      updateData.admin_api_key = bodyObj.admin_api_key;
    }
    if (bodyObj.plan !== undefined)
      updateData.plan = (bodyObj.plan as string | undefined) || undefined;
    if (bodyObj.monthly_budget !== undefined)
      updateData.monthly_budget =
        (bodyObj.monthly_budget as string | number | undefined) || undefined;
    if (bodyObj.organization_name !== undefined)
      updateData.organization_name =
        (bodyObj.organization_name as string | undefined) || undefined;
    if (bodyObj.last_synced_at !== undefined)
      updateData.last_synced_at = bodyObj.last_synced_at;

    // Validate the merged result
    const merged = { ...existing, ...updateData };
    const parsed = AiProviderConfigSchema.safeParse({
      name: merged.name,
      provider: merged.provider,
      admin_api_key: merged.admin_api_key,
      plan: merged.plan,
      monthly_budget: merged.monthly_budget,
      organization_name: merged.organization_name,
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const id = (await params).id;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const db = await getDb();
    const result = await db
      .collection("ai_providers")
      .deleteOne({ _id: new ObjectId(id) });
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
