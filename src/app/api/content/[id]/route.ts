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
  _request: Request,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!ObjectId.isValid(id)) {
      return ApiError("Invalid ID", 400);
    }
    const contentObjectId = new ObjectId(id);

    const body: unknown = await request.json().catch(() => ({}));
    if (!isRecord(body)) {
      return ApiError("Request body must be an object", 400);
    }

    const hasIsPublic = Object.prototype.hasOwnProperty.call(body, "is_public");
    const hasPayload = Object.prototype.hasOwnProperty.call(body, "payload");
    if (!hasIsPublic && !hasPayload) {
      return ApiError("Patch must include is_public or payload", 400);
    }
    if (hasIsPublic && typeof body.is_public !== "boolean") {
      return ApiError("is_public must be a boolean", 400);
    }
    if (hasPayload && !isRecord(body.payload)) {
      return ApiError("payload must be an object", 400);
    }

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");
    const existing = await contentColl.findOne({ _id: contentObjectId });
    if (!existing) return ApiNotFound();

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (hasIsPublic) updateFields.is_public = body.is_public;

    if (hasPayload) {
      const schema = SchemaRegistry[existing.module_type];
      if (!schema) {
        return ApiError("Unknown module_type for existing content", 400);
      }
      if (!isRecord(existing.payload)) {
        return ApiError("Existing content payload is invalid", 500);
      }

      const payloadPatch = body.payload as Record<string, unknown>;
      const invalidField = Object.keys(payloadPatch).find(
        (key) =>
          key.includes(".") ||
          key.startsWith("$") ||
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype",
      );
      if (invalidField) {
        return ApiError(`Invalid payload field: ${invalidField}`, 400);
      }

      const parsedPayload = schema.safeParse({
        ...existing.payload,
        ...payloadPatch,
      });
      if (!parsedPayload.success) {
        return ApiValidationError(parsedPayload.error.format());
      }

      const validatedPayload = parsedPayload.data as Record<string, unknown>;
      const unknownField = Object.keys(payloadPatch).find(
        (key) => !Object.prototype.hasOwnProperty.call(validatedPayload, key),
      );
      if (unknownField) {
        return ApiError(`Unknown payload field: ${unknownField}`, 400);
      }

      for (const key of Object.keys(payloadPatch)) {
        updateFields[`payload.${key}`] = validatedPayload[key];
      }
    }

    await contentColl.updateOne(
      { _id: contentObjectId },
      { $set: updateFields },
    );

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("PATCH /api/content/[id] failed:", error);
    return ApiError("Failed to update content", 500);
  }
}

export async function DELETE(
  _request: Request,
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
