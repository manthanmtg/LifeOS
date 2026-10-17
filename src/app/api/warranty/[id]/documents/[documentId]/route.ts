import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { ApiError, ApiNotFound } from "@/lib/api-response";
import { ApiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import type { ContentDocument } from "@/lib/types";
import { safeWarrantyResponseContentType } from "@/lib/warranty/files";

type Params = { params: Promise<{ id: string; documentId: string }> };

async function isWarrantyAdmin() {
  const token = (await cookies()).get("lifeos_token")?.value;
  return token ? Boolean(await verifyToken(token)) : false;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id, documentId } = await params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(documentId)) {
      return ApiError("Invalid document ID", 400);
    }
    const content = (await getDb()).collection<ContentDocument>("content");
    const parent = await content.findOne({
      _id: new ObjectId(id),
      module_type: "warranty_item",
    });
    if (!parent) return ApiNotFound("Warranty item not found");
    const warrantyKey = (parent.payload as { warranty_key?: string })
      .warranty_key;
    if (!warrantyKey) return ApiError("Warranty item is invalid", 500);
    const document = await content.findOne({
      _id: new ObjectId(documentId),
      module_type: "warranty_document",
      "payload.warranty_key": warrantyKey,
    });
    if (!document) return ApiNotFound("Document not found");
    const payload = document.payload as {
      filename: string;
      content_type: string;
      data: string;
      size: number;
    };
    return new Response(Buffer.from(payload.data, "base64"), {
      headers: {
        "Content-Type": safeWarrantyResponseContentType(payload.content_type),
        "Content-Length": String(payload.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(payload.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/warranty/[id]/documents/[documentId] failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to download warranty document", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id, documentId } = await params;
    if (!ObjectId.isValid(id) || !ObjectId.isValid(documentId)) {
      return ApiError("Invalid document ID", 400);
    }
    const content = (await getDb()).collection<ContentDocument>("content");
    const parent = await content.findOne({
      _id: new ObjectId(id),
      module_type: "warranty_item",
    });
    if (!parent) return ApiNotFound("Warranty item not found");
    const warrantyKey = (
      parent.payload as { warranty_key?: string; archived?: boolean }
    ).warranty_key;
    if ((parent.payload as { archived?: boolean }).archived) {
      return ApiError("Restore this item before deleting documents", 409);
    }
    if (!warrantyKey) return ApiError("Warranty item is invalid", 500);
    const document = await content.findOne({
      _id: new ObjectId(documentId),
      module_type: "warranty_document",
      "payload.warranty_key": warrantyKey,
    });
    if (!document) return ApiNotFound("Document not found");
    await content.deleteOne({
      _id: document._id,
      module_type: "warranty_document",
      "payload.warranty_key": warrantyKey,
    });
    return ApiSuccess({ success: true });
  } catch (error) {
    console.error("DELETE /api/warranty/[id]/documents/[documentId] failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to delete warranty document", 500);
  }
}
