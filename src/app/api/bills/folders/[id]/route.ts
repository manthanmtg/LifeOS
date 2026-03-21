import { getDb } from "@/lib/mongodb";
import { BillFolderSchema } from "@/lib/schemas";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireAdmin())) return ApiError("Unauthorized", 401);

    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const body = await request.json();
    const { payload } = body;

    const parsed = BillFolderSchema.safeParse(payload);
    if (!parsed.success) {
      return ApiValidationError(parsed.error.format());
    }

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");

    const existing = await contentColl.findOne({
      _id: new ObjectId(id),
      module_type: "bill_folder",
    });
    if (!existing) return ApiNotFound();

    await contentColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { payload: parsed.data, updated_at: new Date().toISOString() } },
    );

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("PUT /api/bills/folders/[id] failed:", error);
    return ApiError("Failed to update folder", 500);
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
    const contentColl = db.collection<ContentDocument>("content");

    // Move all bills in this folder to root
    await contentColl.updateMany(
      { module_type: "bill", "payload.folder_id": id },
      {
        $unset: { "payload.folder_id": "" },
        $set: { updated_at: new Date().toISOString() },
      },
    );

    // Delete all child folders recursively (simple: just delete direct children for now,
    // and move their bills to root too)
    const childFolders = await contentColl
      .find({ module_type: "bill_folder", "payload.parent_id": id })
      .toArray();

    for (const child of childFolders) {
      await contentColl.updateMany(
        {
          module_type: "bill",
          "payload.folder_id": child._id!.toString(),
        },
        {
          $unset: { "payload.folder_id": "" },
          $set: { updated_at: new Date().toISOString() },
        },
      );
      await contentColl.deleteOne({ _id: child._id });
    }

    const result = await contentColl.deleteOne({
      _id: new ObjectId(id),
      module_type: "bill_folder",
    });

    if (result.deletedCount === 0) return ApiNotFound();
    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("DELETE /api/bills/folders/[id] failed:", error);
    return ApiError("Failed to delete folder", 500);
  }
}
