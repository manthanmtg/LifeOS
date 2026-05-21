import { getDb } from "@/lib/mongodb";
import { SchemaRegistry } from "@/lib/schemas";
import { ContentDocument } from "@/lib/types";
import { ObjectId } from "mongodb";
import {
  ApiSuccess,
  ApiError,
  ApiValidationError,
  ApiNotFound,
} from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!ObjectId.isValid(id)) {
      return ApiError("Invalid ID", 400);
    }
    const contentObjectId = new ObjectId(id);

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");
    const result = await contentColl.findOne({ _id: contentObjectId });

    if (!result) return ApiNotFound();

    // Security check for private documents
    if (!result.is_public) {
      const cookieStore = await cookies();
      const token = cookieStore.get("lifeos_token")?.value;
      const isAdmin = token ? !!(await verifyToken(token)) : false;

      if (!isAdmin) {
        return ApiError("Unauthorized", 401);
      }
    }

    return ApiSuccess(result);
  } catch (error) {
    console.error("GET /api/content/[id] failed:", error);
    return ApiError("Failed to fetch content", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!ObjectId.isValid(id)) {
      return ApiError("Invalid ID", 400);
    }
    const contentObjectId = new ObjectId(id);

    const body = await request.json().catch(() => ({}));
    const { is_public, payload } = body;

    if (is_public !== undefined && typeof is_public !== "boolean") {
      return ApiError("is_public must be a boolean", 400);
    }

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");

    const existing = await contentColl.findOne({ _id: contentObjectId });
    if (!existing) return ApiNotFound();

    const schema = SchemaRegistry[existing.module_type];
    if (payload !== undefined && !schema) {
      return ApiError("Unknown module_type for existing content", 400);
    }
    const parsedPayload =
      payload !== undefined && schema ? schema.safeParse(payload) : undefined;
    if (parsedPayload && !parsedPayload.success) {
      return ApiValidationError(parsedPayload.error.format());
    }

    const updateData: Partial<ContentDocument> = {
      updated_at: new Date().toISOString(),
    };
    if (is_public !== undefined) updateData.is_public = is_public;
    if (parsedPayload?.success) updateData.payload = parsedPayload.data;

    await contentColl.updateOne({ _id: contentObjectId }, { $set: updateData });

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("PUT /api/content/[id] failed:", error);
    return ApiError("Failed to update content", 500);
  }
}

export async function DELETE(
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!ObjectId.isValid(id)) {
      return ApiError("Invalid ID", 400);
    }
    const contentObjectId = new ObjectId(id);

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");

    const result = await contentColl.deleteOne({ _id: contentObjectId });
    if (result.deletedCount === 0) return ApiNotFound();

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("DELETE /api/content/[id] failed:", error);
    return ApiError("Failed to delete content", 500);
  }
}
