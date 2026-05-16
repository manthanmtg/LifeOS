import { getDb } from "@/lib/mongodb";
import { BillSchema } from "@/lib/schemas";
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

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lifeos_token")?.value;
  return token ? !!(await verifyToken(token)) : false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const db = await getDb();
    const result = await db
      .collection<ContentDocument>("content")
      .findOne({ _id: new ObjectId(id), module_type: "bill" });

    if (!result) return ApiNotFound();
    return ApiSuccess(result);
  } catch (error) {
    console.error("GET /api/bills/[id] failed:", error);
    return ApiError("Failed to fetch bill", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireAdmin())) return ApiError("Unauthorized", 401);

    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);
    const billObjectId = new ObjectId(id);

    const body = await request.json().catch(() => ({}));
    const { payload } = body;

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");

    const existing = await contentColl.findOne(
      {
        _id: billObjectId,
        module_type: "bill",
      },
      {
        projection: { _id: 1 },
      },
    );
    if (!existing) return ApiNotFound();

    const parsed = BillSchema.safeParse(payload);
    if (!parsed.success) {
      return ApiValidationError(parsed.error.format());
    }

    await contentColl.updateOne(
      { _id: billObjectId },
      { $set: { payload: parsed.data, updated_at: new Date().toISOString() } },
    );

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("PUT /api/bills/[id] failed:", error);
    return ApiError("Failed to update bill", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireAdmin())) return ApiError("Unauthorized", 401);

    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const db = await getDb();
    const result = await db
      .collection<ContentDocument>("content")
      .deleteOne({ _id: new ObjectId(id), module_type: "bill" });

    if (result.deletedCount === 0) return ApiNotFound();
    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("DELETE /api/bills/[id] failed:", error);
    return ApiError("Failed to delete bill", 500);
  }
}
