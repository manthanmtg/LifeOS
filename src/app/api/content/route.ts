import { getDb } from "@/lib/mongodb";
import { SchemaRegistry } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";
import { ApiSuccess, ApiError, ApiValidationError } from "@/lib/api-response";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const module_type = searchParams.get("module_type");
        const is_public = searchParams.get("is_public");

        const query: Record<string, string | boolean> = {};
        if (module_type) query.module_type = module_type;
        if (is_public !== null) query.is_public = is_public === "true";

        const db = await getDb();
        const contentColl = db.collection<ContentDocument>("content");
        const results = await contentColl.find(query).sort({ created_at: -1 }).toArray();

        return ApiSuccess(results);
    } catch (error) {
        console.error("GET /api/content failed:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch content";
        return ApiError(message, 500);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { module_type, is_public, payload } = body;

        if (!module_type || module_type === "") {
            return ApiError("module_type is required", 400);
        }

        // Validate using Zod schema if available
        const schema = SchemaRegistry[module_type];
        if (schema) {
            const parsed = schema.safeParse(payload);
            if (!parsed.success) {
                return ApiValidationError(parsed.error.format());
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
        const result = await contentColl.insertOne(doc as ContentDocument);

        return ApiSuccess({ ...doc, _id: result.insertedId, insertedId: result.insertedId }, 201);
    } catch (error) {
        console.error("POST /api/content failed:", error);
        const message = error instanceof Error ? error.message : "Failed to create content";
        return ApiError(message, 500);
    }
}
