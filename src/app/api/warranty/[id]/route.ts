import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { ApiError, ApiNotFound, ApiSuccess } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { WarrantyItemInputSchema } from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

async function isWarrantyAdmin() {
  const token = (await cookies()).get("lifeos_token")?.value;
  return token ? Boolean(await verifyToken(token)) : false;
}

function isArchiveRequest(
  value: unknown,
): value is { revision: number; archived: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Number.isInteger((value as { revision?: unknown }).revision) &&
    (value as { revision: number }).revision > 0 &&
    typeof (value as { archived?: unknown }).archived === "boolean" &&
    Object.keys(value).length === 2
  );
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid warranty item ID", 400);
    const body = await request.json().catch(() => null);
    if (!isArchiveRequest(body))
      return ApiError("Invalid archive request", 400);
    const updated = await (await getDb())
      .collection<ContentDocument>("content")
      .findOneAndUpdate(
        {
          _id: new ObjectId(id),
          module_type: "warranty_item",
          "payload.revision": body.revision,
        },
        {
          $set: {
            "payload.archived": body.archived,
            "payload.revision": body.revision + 1,
            updated_at: new Date().toISOString(),
          },
        },
        { returnDocument: "after" },
      );
    if (!updated)
      return ApiError(
        "This item changed in another session. Reload and try again.",
        409,
      );
    return ApiSuccess({ ...updated, _id: String(updated._id) });
  } catch (error) {
    console.error("PATCH /api/warranty/[id] failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to update warranty item", 500);
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid warranty item ID", 400);
    const item = await (await getDb())
      .collection<ContentDocument>("content")
      .findOne({ _id: new ObjectId(id), module_type: "warranty_item" });
    if (!item) return ApiNotFound("Warranty item not found");
    return ApiSuccess({ ...item, _id: String(item._id) });
  } catch (error) {
    console.error("GET /api/warranty/[id] failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to fetch warranty item", 500);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const { id } = await params;
    if (!ObjectId.isValid(id)) return ApiError("Invalid warranty item ID", 400);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return ApiError("Invalid warranty item update", 400);
    }
    const revision = (body as { revision?: unknown }).revision;
    const parsed = WarrantyItemInputSchema.safeParse(
      (body as { payload?: unknown }).payload,
    );
    if (
      !Number.isInteger(revision) ||
      (revision as number) < 1 ||
      !parsed.success
    ) {
      return ApiError("Invalid warranty item update", 400);
    }
    const content = (await getDb()).collection<ContentDocument>("content");
    const existing = await content.findOne({
      _id: new ObjectId(id),
      module_type: "warranty_item",
      "payload.revision": revision,
    });
    if (!existing)
      return ApiError(
        "This item changed in another session. Reload and try again.",
        409,
      );
    const current = existing.payload as {
      warranty_key: string;
      archived?: boolean;
      linked_bills?: unknown[];
    };
    if (current.archived)
      return ApiError("Restore this item before editing it", 409);
    const {
      linked_bill_ids: _links,
      removed_bill_link_ids: _removed,
      ...nextPayload
    } = parsed.data;
    void _links;
    void _removed;
    const update = {
      ...nextPayload,
      warranty_key: current.warranty_key,
      revision: (revision as number) + 1,
      archived: false,
      linked_bills: current.linked_bills ?? [],
    };
    await content.updateOne(
      {
        _id: existing._id,
        module_type: "warranty_item",
        "payload.revision": revision,
      },
      { $set: { payload: update, updated_at: new Date().toISOString() } },
    );
    return ApiSuccess({
      ...existing,
      _id: String(existing._id),
      payload: update,
    });
  } catch (error) {
    console.error("PUT /api/warranty/[id] failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to update warranty item", 500);
  }
}
