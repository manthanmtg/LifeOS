import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  ExpenseSpaceSchema,
  ExpenseSpaceUpdateInputSchema,
} from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import type {
  ExpenseSpaceCategory,
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
  currencyChangeError,
  findTaxonomyRemovalConflicts,
  normalizeDisplayName,
  normalizeName,
} from "@/lib/expense-spaces/validation";

type Params = { params: Promise<{ spaceId: string }> };
type ExpenseSpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceEntryPayload
>;

function normalizeCategories(
  categories: ExpenseSpaceCategory[],
): ExpenseSpaceCategory[] {
  return categories.map((category) => ({
    ...category,
    name: normalizeDisplayName(category.name),
    subcategories: category.subcategories.map((subcategory) => ({
      ...subcategory,
      name: normalizeDisplayName(subcategory.name),
    })),
  }));
}

async function loadSpace(
  content: Collection<ExpenseSpaceContent>,
  id: ObjectId,
) {
  return content.findOne({ _id: id, module_type: "expense_space" });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const space = await loadSpace(content, new ObjectId(spaceId));
    if (!space) return ApiNotFound("Expense space not found");
    const payload = space.payload as ExpenseSpacePayload;
    const childFilter = {
      module_type: "expense_space_entry",
      "payload.space_key": payload.space_key,
    };
    const [entryCount, usedCategoryIds, usedSubcategoryIds] = await Promise.all(
      [
        content.countDocuments(childFilter),
        aggregateDistinctValues(content, "payload.category_id", childFilter),
        aggregateDistinctValues(content, "payload.subcategory_id", childFilter),
      ],
    );

    return ApiSuccess({
      ...space,
      entry_count: entryCount,
      used_category_ids: usedCategoryIds.filter(
        (value): value is string => typeof value === "string",
      ),
      used_subcategory_ids: usedSubcategoryIds.filter(
        (value): value is string => typeof value === "string",
      ),
    });
  } catch (error) {
    logExpenseSpacesRouteError("/api/expense-spaces/[spaceId]", "GET", error);
    return ApiError("Failed to fetch expense space", 500);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);
    const objectId = new ObjectId(spaceId);

    const body = await request.json().catch(() => ({}));
    const parsed = ExpenseSpaceUpdateInputSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const existing = await loadSpace(content, objectId);
    if (!existing) return ApiNotFound("Expense space not found");
    const existingPayload = existing.payload as ExpenseSpacePayload;
    const { expected_updated_at: expectedUpdatedAt, ...inputPayload } =
      parsed.data;

    const otherSpaces = await content
      .find(
        { module_type: "expense_space", _id: { $ne: objectId } },
        { projection: { _id: 1, "payload.name": 1 } },
      )
      .toArray();
    const nextName = normalizeDisplayName(inputPayload.name);
    if (
      otherSpaces.some((space) => {
        const payload = space.payload as ExpenseSpacePayload;
        return normalizeName(payload.name) === normalizeName(nextName);
      })
    ) {
      return ApiError("An expense space with this name already exists", 409);
    }

    const nextCategories = normalizeCategories(inputPayload.categories);
    const nextCategoryIds = new Set(nextCategories.map((item) => item.id));
    const nextSubcategoryIds = new Set(
      nextCategories.flatMap((category) =>
        category.subcategories.map((item) => item.id),
      ),
    );
    const removedCategories = existingPayload.categories.filter(
      (category) => !nextCategoryIds.has(category.id),
    );
    const removedSubcategories = existingPayload.categories
      .flatMap((category) => category.subcategories)
      .filter((subcategory) => !nextSubcategoryIds.has(subcategory.id));
    const usedCategoryIds = new Set<string>();
    const usedSubcategoryIds = new Set<string>();
    if (removedCategories.length > 0 || removedSubcategories.length > 0) {
      const childFilter = {
        module_type: "expense_space_entry",
        "payload.space_key": existingPayload.space_key,
      };
      const [categoryIds, subcategoryIds] = await Promise.all([
        aggregateDistinctValues(content, "payload.category_id", childFilter),
        aggregateDistinctValues(content, "payload.subcategory_id", childFilter),
      ]);
      for (const value of categoryIds) {
        if (typeof value === "string") usedCategoryIds.add(value);
      }
      for (const value of subcategoryIds) {
        if (typeof value === "string") usedSubcategoryIds.add(value);
      }
    }
    const removalConflicts = findTaxonomyRemovalConflicts(
      existingPayload.categories,
      nextCategories,
      { categoryIds: usedCategoryIds, subcategoryIds: usedSubcategoryIds },
    );
    if (removalConflicts.length > 0) {
      return ApiError(removalConflicts[0], 409);
    }

    const entryCount = await content.countDocuments({
      module_type: "expense_space_entry",
      "payload.space_key": existingPayload.space_key,
    });
    const lockError = currencyChangeError(
      existingPayload.currency,
      inputPayload.currency,
      entryCount,
    );
    if (lockError) return ApiError(lockError, 409);

    const payload = ExpenseSpaceSchema.parse({
      ...inputPayload,
      name: nextName,
      categories: nextCategories,
      space_key: existingPayload.space_key,
    });
    const timestamp = new Date().toISOString();
    const result = await content.updateOne(
      {
        _id: objectId,
        module_type: "expense_space",
        updated_at: expectedUpdatedAt,
      },
      { $set: { payload, updated_at: timestamp } },
    );
    if (result.matchedCount === 0) {
      return ApiError(
        "Expense space changed in another tab. Reload and try again",
        409,
      );
    }

    return ApiSuccess({
      ...existing,
      payload,
      updated_at: timestamp,
      entry_count: entryCount,
    });
  } catch (error) {
    logExpenseSpacesRouteError("/api/expense-spaces/[spaceId]", "PUT", error);
    return ApiError("Failed to update expense space", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId } = await params;
    if (!ObjectId.isValid(spaceId)) return ApiError("Invalid space ID", 400);
    const objectId = new ObjectId(spaceId);
    const body = await request.json().catch(() => ({}));

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const existing = await loadSpace(content, objectId);
    if (!existing) return ApiNotFound("Expense space not found");
    const payload = existing.payload as ExpenseSpacePayload;
    if (body.confirmation !== payload.name) {
      return ApiError("Confirmation must exactly match the space name", 400);
    }

    const children = await content.deleteMany({
      module_type: "expense_space_entry",
      "payload.space_key": payload.space_key,
    });
    const parent = await content.deleteOne({
      _id: objectId,
      module_type: "expense_space",
    });
    if (parent.deletedCount !== 1) {
      return ApiError("Failed to delete expense space", 500);
    }

    return ApiSuccess({
      spaces_deleted: parent.deletedCount,
      entries_deleted: children.deletedCount,
    });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]",
      "DELETE",
      error,
    );
    return ApiError("Failed to delete expense space", 500);
  }
}
