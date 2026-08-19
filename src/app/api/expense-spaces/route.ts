import { getDb } from "@/lib/mongodb";
import {
  ExpenseSpaceCreateInputSchema,
  ExpenseSpaceSchema,
} from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import type {
  ExpenseSpaceCategory,
  ExpenseSpacePayload,
} from "@/modules/expense-spaces/types";
import { ApiError, ApiSuccess, ApiValidationError } from "@/lib/api-response";
import {
  logExpenseSpacesRouteError,
  requireExpenseSpacesAdmin,
} from "@/lib/expense-spaces/server";
import {
  normalizeDisplayName,
  normalizeName,
} from "@/lib/expense-spaces/validation";

const SPACE_PROJECTION = {
  _id: 1,
  module_type: 1,
  is_public: 1,
  created_at: 1,
  updated_at: 1,
  "payload.space_key": 1,
  "payload.name": 1,
  "payload.description": 1,
  "payload.currency": 1,
  "payload.number_format": 1,
  "payload.budget": 1,
  "payload.status": 1,
} as const;

function hydrateCategories(
  categories: Array<{
    id?: string;
    name: string;
    is_active: boolean;
    subcategories: Array<{
      id?: string;
      name: string;
      is_active: boolean;
    }>;
  }>,
): ExpenseSpaceCategory[] {
  return categories.map((category) => ({
    id: category.id ?? crypto.randomUUID(),
    name: normalizeDisplayName(category.name),
    is_active: category.is_active,
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id ?? crypto.randomUUID(),
      name: normalizeDisplayName(subcategory.name),
      is_active: subcategory.is_active,
    })),
  }));
}

export async function GET(request: Request) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }

    const status = new URL(request.url).searchParams.get("status") ?? "active";
    if (!new Set(["active", "archived", "all"]).has(status)) {
      return ApiError("Invalid status filter", 400);
    }

    const db = await getDb();
    const content =
      db.collection<ContentDocument<ExpenseSpacePayload>>("content");
    const query: Record<string, unknown> = { module_type: "expense_space" };
    if (status !== "all") query["payload.status"] = status;

    const spaces = await content
      .find(query, { projection: SPACE_PROJECTION })
      .sort({ "payload.name": 1 })
      .toArray();
    const spaceKeys = spaces.map((space) => space.payload.space_key);
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
    const summaries =
      spaceKeys.length === 0
        ? []
        : await content
            .aggregate<{
              _id: string;
              entry_count: number;
              total_spend: number;
              this_month_spend: number;
              last_entry_date: string | null;
            }>([
              {
                $match: {
                  module_type: "expense_space_entry",
                  "payload.space_key": { $in: spaceKeys },
                },
              },
              {
                $group: {
                  _id: "$payload.space_key",
                  entry_count: { $sum: 1 },
                  total_spend: { $sum: "$payload.amount" },
                  this_month_spend: {
                    $sum: {
                      $cond: [
                        { $gte: ["$payload.date", monthStart] },
                        "$payload.amount",
                        0,
                      ],
                    },
                  },
                  last_entry_date: { $max: "$payload.date" },
                },
              },
            ])
            .toArray();
    const summariesByKey = new Map(
      summaries.map((summary) => [summary._id, summary]),
    );

    return ApiSuccess(
      spaces.map((space) => ({
        ...space,
        summary: summariesByKey.get(space.payload.space_key) ?? {
          entry_count: 0,
          total_spend: 0,
          this_month_spend: 0,
          last_entry_date: null,
        },
      })),
    );
  } catch (error) {
    logExpenseSpacesRouteError("/api/expense-spaces", "GET", error);
    return ApiError("Failed to fetch expense spaces", 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }

    const body = await request.json().catch(() => ({}));
    const parsed = ExpenseSpaceCreateInputSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());

    const db = await getDb();
    const content =
      db.collection<ContentDocument<ExpenseSpacePayload>>("content");
    const existingNames = await content
      .find(
        { module_type: "expense_space" },
        { projection: { _id: 1, "payload.name": 1 } },
      )
      .toArray();
    const name = normalizeDisplayName(parsed.data.name);
    if (
      existingNames.some(
        (space) => normalizeName(space.payload.name) === normalizeName(name),
      )
    ) {
      return ApiError("An expense space with this name already exists", 409);
    }

    const spaceKey = crypto.randomUUID();
    const categories =
      parsed.data.categories.length === 0
        ? [
            {
              id: crypto.randomUUID(),
              name: "Other",
              is_active: true,
              subcategories: [],
            },
          ]
        : hydrateCategories(parsed.data.categories);
    const payload = ExpenseSpaceSchema.parse({
      ...parsed.data,
      name,
      space_key: spaceKey,
      categories,
    });
    const timestamp = new Date().toISOString();
    const document: Omit<ContentDocument<ExpenseSpacePayload>, "_id"> = {
      module_type: "expense_space",
      is_public: false,
      created_at: timestamp,
      updated_at: timestamp,
      payload,
    };
    const result = await content.insertOne(
      document as ContentDocument<ExpenseSpacePayload>,
    );

    return ApiSuccess({ ...document, _id: result.insertedId }, 201);
  } catch (error) {
    logExpenseSpacesRouteError("/api/expense-spaces", "POST", error);
    return ApiError("Failed to create expense space", 500);
  }
}
