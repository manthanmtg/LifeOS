import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  ExpenseSpaceEntryInputSchema,
  ExpenseSpaceEntrySchema,
} from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import type {
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
  logExpenseSpacesRouteError,
  requireExpenseSpacesAdmin,
} from "@/lib/expense-spaces/server";
import {
  normalizeDisplayName,
  validateTaxonomySelection,
} from "@/lib/expense-spaces/validation";

type Params = {
  params: Promise<{ spaceId: string; entryId: string }>;
};
type ExpenseSpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceEntryPayload
>;

async function loadParentAndValidateIds(
  content: Collection<ExpenseSpaceContent>,
  spaceId: string,
  entryId: string,
) {
  if (!ObjectId.isValid(spaceId) || !ObjectId.isValid(entryId)) return null;
  const parent = await content.findOne({
    _id: new ObjectId(spaceId),
    module_type: "expense_space",
  });
  return { parent, entryObjectId: new ObjectId(entryId) };
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId, entryId } = await params;
    if (!ObjectId.isValid(spaceId) || !ObjectId.isValid(entryId)) {
      return ApiError("Invalid space or entry ID", 400);
    }

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const loaded = await loadParentAndValidateIds(content, spaceId, entryId);
    const parent = loaded?.parent;
    if (!parent) return ApiNotFound("Expense space not found");
    const parentPayload = parent.payload as ExpenseSpacePayload;
    if (parentPayload.status === "archived") {
      return ApiError(
        "Restore this expense space before editing expenses",
        409,
      );
    }

    const entry = await content.findOne({
      _id: loaded.entryObjectId,
      module_type: "expense_space_entry",
      "payload.space_key": parentPayload.space_key,
    });
    if (!entry) return ApiNotFound("Expense entry not found");
    const existingPayload = entry.payload as ExpenseSpaceEntryPayload;

    const body = await request.json().catch(() => ({}));
    const parsed = ExpenseSpaceEntryInputSchema.safeParse(body);
    if (!parsed.success) return ApiValidationError(parsed.error.format());
    const taxonomy = validateTaxonomySelection(
      parentPayload.categories,
      parsed.data.category_id,
      parsed.data.subcategory_id,
      { allowInactive: true },
    );
    if (!taxonomy.success) return ApiError(taxonomy.error, 400);
    if (
      !taxonomy.category.is_active &&
      parsed.data.category_id !== existingPayload.category_id
    ) {
      return ApiError("Selected category is archived", 400);
    }
    if (
      taxonomy.subcategory &&
      !taxonomy.subcategory.is_active &&
      parsed.data.subcategory_id !== existingPayload.subcategory_id
    ) {
      return ApiError("Selected subcategory is archived", 400);
    }

    const payload = ExpenseSpaceEntrySchema.parse({
      ...parsed.data,
      paid_to: normalizeDisplayName(parsed.data.paid_to),
      space_key: existingPayload.space_key,
      currency: existingPayload.currency,
    });
    const timestamp = new Date().toISOString();
    const filter = {
      _id: loaded.entryObjectId,
      module_type: "expense_space_entry",
      "payload.space_key": parentPayload.space_key,
    };
    const result = await content.updateOne(filter, {
      $set: { payload, updated_at: timestamp },
    });
    if (result.matchedCount === 0) {
      return ApiNotFound("Expense entry not found");
    }

    return ApiSuccess({ ...entry, payload, updated_at: timestamp });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/entries/[entryId]",
      "PUT",
      error,
    );
    return ApiError("Failed to update expense entry", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }
    const { spaceId, entryId } = await params;
    if (!ObjectId.isValid(spaceId) || !ObjectId.isValid(entryId)) {
      return ApiError("Invalid space or entry ID", 400);
    }

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    const loaded = await loadParentAndValidateIds(content, spaceId, entryId);
    const parent = loaded?.parent;
    if (!parent) return ApiNotFound("Expense space not found");
    const parentPayload = parent.payload as ExpenseSpacePayload;
    if (parentPayload.status === "archived") {
      return ApiError(
        "Restore this expense space before deleting expenses",
        409,
      );
    }

    const result = await content.deleteOne({
      _id: loaded.entryObjectId,
      module_type: "expense_space_entry",
      "payload.space_key": parentPayload.space_key,
    });
    if (result.deletedCount === 0) {
      return ApiNotFound("Expense entry not found");
    }
    return ApiSuccess({ success: true });
  } catch (error) {
    logExpenseSpacesRouteError(
      "/api/expense-spaces/[spaceId]/entries/[entryId]",
      "DELETE",
      error,
    );
    return ApiError("Failed to delete expense entry", 500);
  }
}
