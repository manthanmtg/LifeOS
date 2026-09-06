import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ExpenseSpaceDocumentRenameSchema } from "@/lib/schemas";
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
import {
  splitDocumentFilename,
  validateDocumentFilename,
} from "@/lib/expense-spaces/document-filename";

type Params = { params: Promise<{ spaceId: string; documentId: string }> };
type SpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceDocumentPayload
>;

const DOCUMENT_PROJECTION = {
  _id: 1,
  module_type: 1,
  is_public: 1,
  created_at: 1,
  updated_at: 1,
  "payload.space_key": 1,
  "payload.filename": 1,
  "payload.content_type": 1,
  "payload.size": 1,
} as const;

function documentMetadata(document: SpaceContent) {
  const { data: _data, ...payload } =
    document.payload as ExpenseSpaceDocumentPayload;
  void _data;
  return { ...document, _id: String(document._id), payload };
}

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

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin()))
      return ApiError("Unauthorized", 401);
    const resolved = await resolveDocuments(params);
    if (!resolved) return ApiError("Invalid document ID", 400);
    if (!resolved.parent) return ApiNotFound("Expense space not found");
    if (!resolved.document) return ApiNotFound("Document not found");
    if ((resolved.parent.payload as ExpenseSpacePayload).status === "archived")
      return ApiError(
        "Restore this expense space before renaming documents",
        409,
      );
    const parsed = ExpenseSpaceDocumentRenameSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return ApiError("Invalid document filename", 400);
    const filename = parsed.data.filename;
    const filenameError = validateDocumentFilename(filename);
    if (filenameError) return ApiError(filenameError, 400);
    const current = resolved.document.payload as ExpenseSpaceDocumentPayload;
    const { extension: currentExtension } = splitDocumentFilename(
      current.filename,
    );
    const { basename, extension } = splitDocumentFilename(filename);
    if (!basename) return ApiError("Filename is required", 400);
    if (extension !== currentExtension)
      return ApiError("File extension cannot be changed", 400);
    if (filename === current.filename)
      return ApiSuccess(documentMetadata(resolved.document));
    const updated = await resolved.content.findOneAndUpdate(
      {
        _id: resolved.document._id,
        module_type: "expense_space_document",
        "payload.space_key": (resolved.parent.payload as ExpenseSpacePayload)
          .space_key,
      },
      {
        $set: {
          "payload.filename": filename,
          updated_at: new Date().toISOString(),
        },
      },
      { returnDocument: "after", projection: DOCUMENT_PROJECTION },
    );
    if (!updated) return ApiNotFound("Document not found");
    return ApiSuccess(documentMetadata(updated));
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/docs/[documentId]",
      "PATCH",
      error,
    );
    return ApiError("Failed to rename document", 500);
  }
}
