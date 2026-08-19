import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { ContentDocument } from "@/lib/types";
import type {
  ExpenseSpaceEntryPayload,
  ExpenseSpacePayload,
} from "@/modules/expense-spaces/types";
import { ApiError, ApiNotFound, ApiSuccess } from "@/lib/api-response";
import {
  logExpenseSpacesRouteError,
  requireExpenseSpacesAdmin,
} from "@/lib/expense-spaces/server";
import { isCalendarDate } from "@/lib/expense-spaces/validation";
import {
  calculateExpenseSpaceAnalytics,
  type ExpenseSpaceAnalyticsEntry,
  type ExpenseSpaceAnalyticsParent,
} from "@/lib/expense-spaces/analytics";

type ExpenseSpaceContent = ContentDocument<
  ExpenseSpacePayload | ExpenseSpaceEntryPayload
>;

const PARENT_PROJECTION = {
  _id: 1,
  "payload.space_key": 1,
  "payload.name": 1,
  "payload.currency": 1,
  "payload.status": 1,
  "payload.categories": 1,
} as const;

const ENTRY_ANALYTICS_PROJECTION = {
  _id: 1,
  "payload.space_key": 1,
  "payload.amount": 1,
  "payload.currency": 1,
  "payload.date": 1,
  "payload.paid_to": 1,
  "payload.category_id": 1,
  "payload.subcategory_id": 1,
  "payload.payment_method": 1,
  "payload.description": 1,
} as const;

function parentForAnalytics(
  document: ContentDocument<ExpenseSpacePayload | ExpenseSpaceEntryPayload>,
): ExpenseSpaceAnalyticsParent {
  const payload = document.payload as ExpenseSpacePayload;
  return {
    id: document._id?.toString() ?? "",
    spaceKey: payload.space_key,
    name: payload.name,
    currency: payload.currency,
    categories: payload.categories,
  };
}

function entryForAnalytics(
  document: ContentDocument<ExpenseSpacePayload | ExpenseSpaceEntryPayload>,
): ExpenseSpaceAnalyticsEntry {
  const payload = document.payload as ExpenseSpaceEntryPayload;
  return {
    id: document._id?.toString() ?? "",
    spaceKey: payload.space_key,
    amount: payload.amount,
    currency: payload.currency,
    description: payload.description,
    paidTo: payload.paid_to,
    categoryId: payload.category_id,
    subcategoryId: payload.subcategory_id,
    paymentMethod: payload.payment_method,
    date: payload.date,
  };
}

export async function GET(request: Request) {
  try {
    if (!(await requireExpenseSpacesAdmin())) {
      return ApiError("Unauthorized", 401);
    }

    const params = new URL(request.url).searchParams;
    const scope = params.get("scope");
    if (scope !== "space" && scope !== "all") {
      return ApiError("scope must be space or all", 400);
    }
    const dateFrom = params.get("date_from") ?? undefined;
    const dateTo = params.get("date_to") ?? undefined;
    if (dateFrom && !isCalendarDate(dateFrom)) {
      return ApiError("date_from must be a valid YYYY-MM-DD date", 400);
    }
    if (dateTo && !isCalendarDate(dateTo)) {
      return ApiError("date_to must be a valid YYYY-MM-DD date", 400);
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return ApiError("date range cannot be reversed", 400);
    }

    const requestedCurrency = params.get("currency");
    if (
      scope === "all" &&
      (!requestedCurrency || !/^[A-Z]{3}$/.test(requestedCurrency))
    ) {
      return ApiError(
        "A valid currency is required for all-space analytics",
        400,
      );
    }

    const db = await getDb();
    const content = db.collection<ExpenseSpaceContent>("content");
    let parents: ExpenseSpaceContent[];
    let selectedSpaceId: string | undefined;
    if (scope === "space") {
      const spaceId = params.get("space_id");
      if (!spaceId || !ObjectId.isValid(spaceId)) {
        return ApiError("A valid space_id is required", 400);
      }
      const parent = await content.findOne(
        { _id: new ObjectId(spaceId), module_type: "expense_space" },
        { projection: PARENT_PROJECTION },
      );
      if (!parent) return ApiNotFound("Expense space not found");
      parents = [parent];
      selectedSpaceId = spaceId;
    } else {
      parents = await content
        .find(
          { module_type: "expense_space" },
          { projection: PARENT_PROJECTION },
        )
        .toArray();
    }

    const analyticsParents = parents.map(parentForAnalytics);
    const availableCurrencies = [
      ...new Set(analyticsParents.map((parent) => parent.currency)),
    ].sort();
    const currency =
      scope === "space"
        ? analyticsParents[0].currency
        : (requestedCurrency as string);
    if (
      scope === "all" &&
      availableCurrencies.length > 0 &&
      !availableCurrencies.includes(currency)
    ) {
      return ApiError("Currency is not used by any expense space", 400);
    }

    const spaceKeys = analyticsParents.map((parent) => parent.spaceKey);
    const entryQuery: Record<string, unknown> = {
      module_type: "expense_space_entry",
      "payload.space_key":
        scope === "space" ? spaceKeys[0] : { $in: spaceKeys },
      "payload.currency": currency,
    };
    if (dateFrom || dateTo) {
      entryQuery["payload.date"] = {
        ...(dateFrom ? { $gte: dateFrom } : {}),
        ...(dateTo ? { $lte: dateTo } : {}),
      };
    }
    const entries =
      spaceKeys.length === 0
        ? []
        : await content
            .find(entryQuery, { projection: ENTRY_ANALYTICS_PROJECTION })
            .toArray();
    const analytics = calculateExpenseSpaceAnalytics({
      scope,
      currency,
      spaceId: selectedSpaceId,
      dateFrom,
      dateTo,
      spaces: analyticsParents,
      entries: entries.map(entryForAnalytics),
    });

    return ApiSuccess({
      ...analytics,
      available_currencies: availableCurrencies,
      no_conversion: true,
    });
  } catch (error) {
    logExpenseSpacesRouteError("/api/expense-spaces/analytics", "GET", error);
    return ApiError("Failed to calculate expense-space analytics", 500);
  }
}
