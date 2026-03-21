import { getDb } from "@/lib/mongodb";
import { ContentDocument } from "@/lib/types";
import { ObjectId } from "mongodb";
import { ApiSuccess, ApiError, ApiNotFound } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const body = await request.json();
    const { parent_id } = body as { parent_id: string | null };

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");

    const existing = await contentColl.findOne({
      _id: new ObjectId(id),
      module_type: "bill_folder",
    });
    if (!existing) return ApiNotFound();

    // Prevent moving a folder into itself or its descendants
    if (parent_id) {
      if (!ObjectId.isValid(parent_id))
        return ApiError("Invalid parent ID", 400);
      if (parent_id === id)
        return ApiError("Cannot move folder into itself", 400);

      // Check that parent_id is not a descendant of this folder
      const allFolders = await contentColl
        .find({ module_type: "bill_folder" })
        .toArray();

      const isDescendant = (folderId: string, targetId: string): boolean => {
        const children = allFolders.filter(
          (f) => (f.payload as { parent_id?: string }).parent_id === folderId,
        );
        for (const child of children) {
          const childId = child._id!.toString();
          if (childId === targetId) return true;
          if (isDescendant(childId, targetId)) return true;
        }
        return false;
      };

      if (isDescendant(id, parent_id)) {
        return ApiError("Cannot move folder into its own descendant", 400);
      }

      const parentFolder = await contentColl.findOne({
        _id: new ObjectId(parent_id),
        module_type: "bill_folder",
      });
      if (!parentFolder) return ApiError("Target parent folder not found", 404);
    }

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parent_id) {
      updateFields["payload.parent_id"] = parent_id;
    }

    const unsetFields: Record<string, string> = {};
    if (!parent_id) {
      unsetFields["payload.parent_id"] = "";
    }

    const updateOp: Record<string, unknown> = { $set: updateFields };
    if (Object.keys(unsetFields).length > 0) {
      updateOp.$unset = unsetFields;
    }

    await contentColl.updateOne({ _id: new ObjectId(id) }, updateOp);

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("PUT /api/bills/folders/[id]/move failed:", error);
    return ApiError("Failed to move folder", 500);
  }
}
