import { getDb } from "@/lib/mongodb";
import { ContentDocument } from "@/lib/types";
import { ObjectId } from "mongodb";
import { ApiSuccess, ApiError, ApiNotFound } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { BillPayload, BillAttachment } from "@/modules/bills/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
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
    const { filename, content_type, data } = body as {
      filename: string;
      content_type: string;
      data: string;
    };

    if (!filename || !content_type || !data) {
      return ApiError("filename, content_type, and data are required", 400);
    }

    // Validate file type
    if (
      !content_type.startsWith("image/") &&
      content_type !== "application/pdf"
    ) {
      return ApiError("Only image files and PDFs are allowed", 400);
    }

    // Estimate decoded size from base64
    const estimatedSize = Math.floor((data.length * 3) / 4);
    if (estimatedSize > MAX_FILE_SIZE) {
      return ApiError("File exceeds 5 MB limit", 400);
    }

    const db = await getDb();
    const contentColl = db.collection<ContentDocument<BillPayload>>("content");

    const existing = await contentColl.findOne({
      _id: new ObjectId(id),
      module_type: "bill",
    });
    if (!existing) return ApiNotFound();

    const attachment: BillAttachment = {
      id: crypto.randomUUID(),
      filename,
      content_type,
      data,
      size: estimatedSize,
      uploaded_at: new Date().toISOString(),
    };

    const currentAttachments: BillAttachment[] =
      (existing.payload as BillPayload).attachments ?? [];

    await contentColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          "payload.attachments": [...currentAttachments, attachment],
          updated_at: new Date().toISOString(),
        },
      },
    );

    return ApiSuccess(attachment, 201);
  } catch (error) {
    console.error("POST /api/bills/[id]/attachments failed:", error);
    return ApiError("Failed to upload attachment", 500);
  }
}
