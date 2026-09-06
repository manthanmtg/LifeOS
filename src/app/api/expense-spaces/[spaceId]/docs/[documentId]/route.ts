import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { ContentDocument } from "@/lib/types";
import type {
  ExpenseSpaceDocumentPayload,
  ExpenseSpacePayload,
} from "@/modules/expense-spaces/types";
import { ApiError, ApiNotFound, ApiSuccess } from "@/lib/api-response";
import {
  logExpenseSpacesRouteError,
  requireExpenseSpacesAdmin,
} from "@/lib/expense-spaces/server";

type Params = { params: Promise<{ spaceId: string; documentId: string }> };
type SpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceDocumentPayload
>;

async function resolveDocuments(params: Params["params"]) {
  const { spaceId, documentId } = await params;
  if (!ObjectId.isValid(spaceId) || !ObjectId.isValid(documentId)) return null;
  const db = await getDb();
  const content = db.collection<SpaceContent>("content");
  const parent = await content.findOne({
    _id: new ObjectId(spaceId),
    module_type: "expense_space",
  });
  if (!parent) return { content, parent: null, document: null };
  const document = await content.findOne({
    _id: new ObjectId(documentId),
    module_type: "expense_space_document",
    "payload.space_key": (parent.payload as ExpenseSpacePayload).space_key,
  });
  return { content, parent, document };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin()))
      return ApiError("Unauthorized", 401);
    const resolved = await resolveDocuments(params);
    if (!resolved) return ApiError("Invalid document ID", 400);
    if (!resolved.parent) return ApiNotFound("Expense space not found");
    if (!resolved.document) return ApiNotFound("Document not found");
    const payload = resolved.document.payload as ExpenseSpaceDocumentPayload;
    return new Response(Buffer.from(payload.data ?? "", "base64"), {
      headers: {
        "Content-Type": payload.content_type || "application/octet-stream",
        "Content-Length": String(payload.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(payload.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/docs/[documentId]",
      "GET",
      error,
    );
    return ApiError("Failed to download document", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin()))
      return ApiError("Unauthorized", 401);
    const resolved = await resolveDocuments(params);
    if (!resolved) return ApiError("Invalid document ID", 400);
    if (!resolved.parent) return ApiNotFound("Expense space not found");
    if (!resolved.document) return ApiNotFound("Document not found");
    if ((resolved.parent.payload as ExpenseSpacePayload).status === "archived")
      return ApiError(
        "Restore this expense space before deleting documents",
        409,
      );
    await resolved.content.deleteOne({
      _id: resolved.document._id,
      module_type: "expense_space_document",
    });
    return ApiSuccess({ success: true });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/docs/[documentId]",
      "DELETE",
      error,
    );
    return ApiError("Failed to delete document", 500);
  }
}
