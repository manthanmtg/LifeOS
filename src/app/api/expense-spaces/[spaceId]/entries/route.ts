import { ObjectId, type Sort } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  ExpenseSpaceEntryInputSchema,
  ExpenseSpaceEntrySchema,
} from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import type {
  ExpensePaymentMethod,
  ExpenseSpaceEntryPayload,
  ExpenseSpacePayload,
} from "@/modules/expense-spaces/types";
import {
  ApiError,
  ApiNotFound,
  ApiSuccess,
  ApiValidationError,
} from "@/lib/api-response";
import {
  aggregateDistinctValues,
  logExpenseSpacesRouteError,
  requireExpenseSpacesAdmin,
} from "@/lib/expense-spaces/server";
import {
  escapeRegex,
  ExpenseSpaceQueryError,
  normalizeDisplayName,
  normalizeName,
  parseExpenseEntryFilters,
  validateTaxonomySelection,
} from "@/lib/expense-spaces/validation";

type Params = { params: Promise<{ spaceId: string }> };
type ExpenseSpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceEntryPayload
>;

const ENTRY_PROJECTION = {
  _id: 1,
  module_type: 1,
  is_public: 1,
  created_at: 1,
  updated_at: 1,
  payload: 1,
} as const;

const SORTS: Record<string, Sort> = {
  "date-desc": { "payload.date": -1, _id: -1 },
  "date-asc": { "payload.date": 1, _id: 1 },
  "amount-desc": { "payload.amount": -1, _id: -1 },
  "amount-asc": { "payload.amount": 1, _id: 1 },
  "paid-to-asc": { "payload.paid_to": 1, _id: 1 },
};

function normalizedExactRegex(value: string) {
  return `^${normalizeDisplayName(value)
    .split(" ")
    .map(escapeRegex)
    .join("\\s+")}$`;
}

function normalizeStringFacets(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .flatMap((value) => {
      if (typeof value !== "string") return [];
      const display = normalizeDisplayName(value);
      const key = normalizeName(display);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [display];
    })
    .sort((a, b) => a.localeCompare(b));
}

export async function GET(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);

    let filters;
    try {
      filters = parseExpenseEntryFilters(new URL(request.url).searchParams);
    } catch (error) {
      if (error instanceof ExpenseSpaceQueryError) {
        return ApiError(error.message, 400);
      }
      throw error;
    }

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const parent = await content.findOne({
      _id: new ObjectId(spaceId),
      module_type: "expense_space",
    });
    if (!parent) return ApiNotFound("Expense space not found");
    const parentPayload = parent.payload as ExpenseSpacePayload;

    if (filters.categoryId) {
      const taxonomy = validateTaxonomySelection(
        parentPayload.categories,
        filters.categoryId,
        filters.subcategoryId,
        { allowInactive: true },
      );
      if (!taxonomy.success) return ApiError(taxonomy.error, 400);
    } else if (filters.subcategoryId) {
      return ApiError("subcategory_id requires category_id", 400);
    }

    const query: Record<string, unknown> = {
      module_type: "expense_space_entry",
      "payload.space_key": parentPayload.space_key,
    };
    if (filters.dateFrom || filters.dateTo) {
      query["payload.date"] = {
        ...(filters.dateFrom ? { $gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { $lte: filters.dateTo } : {}),
      };
    }
    if (filters.categoryId) {
      query["payload.category_id"] = filters.categoryId;
    }
    if (filters.subcategoryId) {
      query["payload.subcategory_id"] = filters.subcategoryId;
    }
    if (filters.paymentMethod) {
      query["payload.payment_method"] = filters.paymentMethod;
    }
    if (filters.paidTo) {
      query["payload.paid_to"] = {
        $regex: normalizedExactRegex(filters.paidTo),
        $options: "i",
      };
    }
    if (filters.search) {
      const pattern = escapeRegex(filters.search);
      query.$or = [
        { "payload.description": { $regex: pattern, $options: "i" } },
        { "payload.paid_to": { $regex: pattern, $options: "i" } },
        { "payload.reference": { $regex: pattern, $options: "i" } },
        { "payload.tags": { $regex: pattern, $options: "i" } },
      ];
    }

    const facetFilter = {
      module_type: "expense_space_entry",
      "payload.space_key": parentPayload.space_key,
    } as const;
    const [entries, total, payees, descriptions, tags, paymentMethods] =
      await Promise.all([
        content
          .find(query, { projection: ENTRY_PROJECTION })
          .sort(SORTS[filters.sort])
          .skip((filters.page - 1) * filters.pageSize)
          .limit(filters.pageSize)
          .toArray(),
        content.countDocuments(query),
        aggregateDistinctValues(content, "payload.paid_to", facetFilter),
        aggregateDistinctValues(content, "payload.description", facetFilter),
        aggregateDistinctValues(content, "payload.tags", facetFilter, {
          unwind: true,
        }),
        aggregateDistinctValues(content, "payload.payment_method", facetFilter),
      ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
    if (total > 0 && filters.page > totalPages) {
      return ApiError("page exceeds the available result pages", 400);
    }
    return ApiSuccess({
      entries,
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
      facets: {
        paid_to: normalizeStringFacets(payees),
        descriptions: normalizeStringFacets(descriptions),
        tags: normalizeStringFacets(tags),
        payment_methods: paymentMethods.filter(
          (value): value is ExpensePaymentMethod => typeof value === "string",
        ),
      },
    });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/entries",
      "GET",
      error,
    );
    return ApiError("Failed to fetch expense entries", 500);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const parent = await content.findOne({
      _id: new ObjectId(spaceId),
      module_type: "expense_space",
    });
    if (!parent) return ApiNotFound("Expense space not found");
    const parentPayload = parent.payload as ExpenseSpacePayload;
    if (parentPayload.status === "archived") {
      return ApiError("Restore this expense space before adding expenses", 409);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ExpenseSpaceEntryInputSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());
    const taxonomy = validateTaxonomySelection(
      parentPayload.categories,
      parsed.data.category_id,
      parsed.data.subcategory_id,
    );
    if (!taxonomy.success) return ApiError(taxonomy.error, 400);

    const payload = ExpenseSpaceEntrySchema.parse({
      ...parsed.data,
      paid_to: normalizeDisplayName(parsed.data.paid_to),
      space_key: parentPayload.space_key,
      currency: parentPayload.currency,
    });
    const timestamp = new Date().toISOString();
    const document: Omit<ContentDocument<ExpenseSpaceEntryPayload>, "_id"> = {
      module_type: "expense_space_entry",
      is_public: false,
      created_at: timestamp,
      updated_at: timestamp,
      payload,
    };
    const result = await content.insertOne(
      document as ContentDocument<ExpenseSpaceEntryPayload>,
    );

    return ApiSuccess({ ...document, _id: result.insertedId }, 201);
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/entries",
      "POST",
      error,
    );
    return ApiError("Failed to create expense entry", 500);
  }
}
