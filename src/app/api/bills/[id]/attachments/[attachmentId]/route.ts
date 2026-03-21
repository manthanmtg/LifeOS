import { getDb } from "@/lib/mongodb";
import { ContentDocument } from "@/lib/types";
import { ObjectId } from "mongodb";
import { ApiSuccess, ApiError, ApiNotFound } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { BillPayload } from "@/modules/bills/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;
    if (!isAdmin) return ApiError("Unauthorized", 401);

    const { id, attachmentId } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid ID", 400);

    const db = await getDb();
    const contentColl = db.collection<ContentDocument<BillPayload>>("content");

    const existing = await contentColl.findOne({
      _id: new ObjectId(id),
      module_type: "bill",
    });
    if (!existing) return ApiNotFound();

    const attachments = (existing.payload as BillPayload).attachments ?? [];
    const filtered = attachments.filter((a) => a.id !== attachmentId);

    if (filtered.length === attachments.length) {
      return ApiNotFound("Attachment not found");
    }

    await contentColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          "payload.attachments": filtered,
          updated_at: new Date().toISOString(),
        },
      },
    );

    return ApiSuccess({ success: true });
  } catch (error) {
    console.error(
      "DELETE /api/bills/[id]/attachments/[attachmentId] failed:",
      error,
    );
    return ApiError("Failed to delete attachment", 500);
  }
}
