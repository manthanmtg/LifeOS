import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import {
  ApiError,
  ApiNotFound,
  ApiSuccess,
  ApiValidationError,
} from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { WarrantyDocumentSchema } from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import { parseWarrantyUpload } from "@/lib/warranty/uploads";

type Params = { params: Promise<{ id: string }> };

async function isWarrantyAdmin() {
  const token = (await cookies()).get("lifeos_token")?.value;
  return token ? Boolean(await verifyToken(token)) : false;
}

function documentMetadata(document: ContentDocument) {
  const { data: _data, ...payload } = document.payload as Record<
    string,
    unknown
  >;
  void _data;
  return { ...document, _id: String(document._id), payload };
}

function validAssociation(
  parent: ContentDocument,
  coverageId?: string,
  serviceId?: string,
) {
  const payload = parent.payload as {
    coverages?: Array<{ id: string; archived?: boolean }>;
    service_history?: Array<{ id: string; archived?: boolean }>;
  };
  if (coverageId)
    return (
      payload.coverages?.some(
        (entry) => entry.id === coverageId && !entry.archived,
      ) ?? false
    );
  if (serviceId)
    return (
      payload.service_history?.some(
        (entry) => entry.id === serviceId && !entry.archived,
      ) ?? false
    );
  return true;
}

export async function POST(request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid warranty item ID", 400);
    const body = await request.json().catch(() => null);
    let uploaded;
    try {
      uploaded = parseWarrantyUpload(body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid document upload";
      return ApiError(
        message,
        message === "File exceeds 5 MB limit" ? 413 : 400,
      );
    }
    const db = await getDb();
    const content = db.collection<ContentDocument>("content");
    const parent = await content.findOne({
      _id: new ObjectId(id),
      module_type: "warranty_item",
    });
    if (!parent) return ApiNotFound("Warranty item not found");
    const parentPayload = parent.payload as {
      warranty_key?: string;
      archived?: boolean;
    };
    if (parentPayload.archived)
      return ApiError("Restore this item before uploading documents", 409);
    if (!parentPayload.warranty_key)
      return ApiError("Warranty item is invalid", 500);
    const parsed = WarrantyDocumentSchema.safeParse({
      warranty_key: parentPayload.warranty_key,
      ...uploaded,
      kind:
        body && typeof body === "object"
          ? (body as { kind?: unknown }).kind
          : undefined,
      coverage_id:
        body && typeof body === "object"
          ? (body as { coverage_id?: unknown }).coverage_id
          : undefined,
      service_id:
        body && typeof body === "object"
          ? (body as { service_id?: unknown }).service_id
          : undefined,
      notes:
        body && typeof body === "object"
          ? (body as { notes?: unknown }).notes
          : undefined,
    });
    if (!parsed.success) return ApiValidationError(parsed.error.format());
    if (
      !validAssociation(parent, parsed.data.coverage_id, parsed.data.service_id)
    ) {
      return ApiError(
        "Document association does not belong to this active item entry",
        400,
      );
    }
    const timestamp = new Date().toISOString();
    const document: Omit<ContentDocument, "_id"> = {
      module_type: "warranty_document",
      is_public: false,
      created_at: timestamp,
      updated_at: timestamp,
      payload: parsed.data,
    };
    const inserted = await content.insertOne(document as ContentDocument);
    return ApiSuccess(
      documentMetadata({ ...document, _id: inserted.insertedId }),
      201,
    );
  } catch (error) {
    console.error("POST /api/warranty/[id]/documents failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to upload warranty document", 500);
  }
}

export async function GET(request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid warranty item ID", 400);
    const content = (await getDb()).collection<ContentDocument>("content");
    const parent = await content.findOne({
      _id: new ObjectId(id),
      module_type: "warranty_item",
    });
    if (!parent) return ApiNotFound("Warranty item not found");
    const warrantyKey = (parent.payload as { warranty_key?: string })
      .warranty_key;
    if (!warrantyKey) return ApiError("Warranty item is invalid", 500);
    const search = new URL(request.url).searchParams
      .get("search")
      ?.trim()
      .toLowerCase();
    const documents = await content
      .find({
        module_type: "warranty_document",
        "payload.warranty_key": warrantyKey,
      })
      .sort({ created_at: -1, _id: -1 })
      .toArray();
    const metadata = documents.map(documentMetadata).filter((document) => {
      const filename =
        (document.payload as { filename?: string }).filename ?? "";
      return !search || filename.toLowerCase().includes(search);
    });
    return ApiSuccess({ documents: metadata, total: metadata.length });
  } catch (error) {
    console.error("GET /api/warranty/[id]/documents failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to fetch warranty documents", 500);
  }
}
