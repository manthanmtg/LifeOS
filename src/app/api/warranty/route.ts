import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { verifyToken } from "@/lib/auth";
import { ApiError, ApiSuccess, ApiValidationError } from "@/lib/api-response";
import { getDb } from "@/lib/mongodb";
import { WarrantyItemInputSchema } from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import { getCoverageStatus } from "@/lib/warranty/coverage";

async function isWarrantyAdmin() {
  const token = (await cookies()).get("lifeos_token")?.value;
  return token ? Boolean(await verifyToken(token)) : false;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toWarrantyListItem(document: ContentDocument) {
  const payload = document.payload as {
    name: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    location?: string;
    seller?: string;
    coverages?: Array<{
      id?: string;
      label: string;
      start_date?: string;
      end_date?: string;
      archived?: boolean;
    }>;
  };
  return {
    ...document,
    _id: String(document._id),
    payload,
    coverage_statuses: (payload.coverages ?? [])
      .filter((coverage) => !coverage.archived)
      .map((coverage) => ({
        id: coverage.id,
        label: coverage.label,
        end_date: coverage.end_date,
        ...getCoverageStatus(coverage, today()),
      })),
  };
}

export async function GET(request: Request) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const searchParams = new URL(request.url).searchParams;
    const archived = searchParams.get("archived") ?? "false";
    if (!["false", "true", "all"].includes(archived)) {
      return ApiError("Invalid archived filter", 400);
    }
    const query: Record<string, unknown> = { module_type: "warranty_item" };
    if (archived !== "all") query["payload.archived"] = archived === "true";
    const category = searchParams.get("category");
    if (category) query["payload.category"] = category;
    const ownership = searchParams.get("ownership");
    if (ownership) query["payload.ownership_status"] = ownership;
    const db = await getDb();
    const documents = await db
      .collection<ContentDocument>("content")
      .find(query)
      .sort({ updated_at: -1, _id: -1 })
      .toArray();
    const search = searchParams.get("search")?.trim().toLowerCase();
    const items = documents.map(toWarrantyListItem).filter((item) => {
      if (!search) return true;
      const fields = [
        item.payload.name,
        item.payload.brand,
        item.payload.model,
        item.payload.serial_number,
        item.payload.location,
        item.payload.seller,
      ];
      return fields.some((value) => value?.toLowerCase().includes(search));
    });
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("page_size") ?? "25");
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return ApiError("Invalid pagination", 400);
    }
    const total = items.length;
    return ApiSuccess({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      today: today(),
      timezone: "UTC",
    });
  } catch (error) {
    console.error("GET /api/warranty failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to fetch warranty items", 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isWarrantyAdmin())) return ApiError("Unauthorized", 401);
    const body = await request.json().catch(() => ({}));
    const parsed = WarrantyItemInputSchema.safeParse(
      body && typeof body === "object"
        ? (body as { payload?: unknown }).payload
        : undefined,
    );
    if (!parsed.success) return ApiValidationError(parsed.error.format());

    const {
      linked_bill_ids,
      removed_bill_link_ids: _removed,
      ...payload
    } = parsed.data;
    void _removed;
    const db = await getDb();
    const content = db.collection<ContentDocument>("content");
    const linked_bills =
      linked_bill_ids.length === 0
        ? []
        : await content
            .find({
              _id: { $in: linked_bill_ids.map((id) => new ObjectId(id)) },
              module_type: "bill",
            })
            .project({ "payload.name": 1 })
            .toArray()
            .then((bills) => {
              if (bills.length !== linked_bill_ids.length) {
                throw new Error("One or more selected bills no longer exist");
              }
              return bills.map((bill) => ({
                id: crypto.randomUUID(),
                bill_id: String(bill._id),
                name_snapshot:
                  typeof (bill.payload as { name?: unknown }).name === "string"
                    ? (bill.payload as { name: string }).name
                    : "Bill",
              }));
            });
    const timestamp = new Date().toISOString();
    const document: Omit<ContentDocument, "_id"> = {
      module_type: "warranty_item",
      is_public: false,
      created_at: timestamp,
      updated_at: timestamp,
      payload: {
        ...payload,
        warranty_key: crypto.randomUUID(),
        revision: 1,
        archived: false,
        linked_bills,
      },
    };
    const inserted = await content.insertOne(document as ContentDocument);
    return ApiSuccess({ ...document, _id: inserted.insertedId }, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "One or more selected bills no longer exist"
    ) {
      return ApiError(error.message, 400);
    }
    console.error("POST /api/warranty failed", {
      error_type: error instanceof Error ? error.name : "UnknownError",
    });
    return ApiError("Failed to create warranty item", 500);
  }
}
