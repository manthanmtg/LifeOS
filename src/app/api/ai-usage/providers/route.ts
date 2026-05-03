import { getDb } from "@/lib/mongodb";
import { AiProviderConfigSchema } from "@/lib/schemas";
import { ApiSuccess, ApiError, ApiValidationError } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

function maskKey(key: string): string {
  if (key.length <= 8) return "****" + key.slice(-4);
  return key.slice(0, 7) + "..." + key.slice(-4);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const db = await getDb();
    const coll = db.collection("ai_providers");
    const providers = await coll.find().sort({ created_at: -1 }).toArray();
    // Mask API keys before sending to client
    const masked = providers.map((p) => ({
      ...p,
      admin_api_key: maskKey(p.admin_api_key),
    }));
    return ApiSuccess(masked);
  } catch (error) {
    console.error("GET /api/ai-usage/providers failed:", error);
    return ApiError("Failed to fetch providers", 500);
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiError("Bad request", 400);
    }

    const parsed = AiProviderConfigSchema.safeParse(body);
    if (!parsed.success) {
      return ApiValidationError(parsed.error.format());
    }

    const doc = {
      ...parsed.data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const db = await getDb();
    const coll = db.collection("ai_providers");
    const result = await coll.insertOne(doc);

    return ApiSuccess(
      {
        ...doc,
        _id: result.insertedId,
        admin_api_key: maskKey(doc.admin_api_key),
      },
      201,
    );
  } catch (error) {
    console.error("POST /api/ai-usage/providers failed:", error);
    return ApiError("Failed to create provider", 500);
  }
}
