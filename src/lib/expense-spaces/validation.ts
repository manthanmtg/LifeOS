import {
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_SPACE_MAX_PAGE_SIZE,
  EXPENSE_SPACE_PAGE_SIZE,
} from "@/modules/expense-spaces/constants";
import type {
  ExpenseEntryFilters,
  ExpensePaymentMethod,
  ExpenseSpaceCategory,
} from "@/modules/expense-spaces/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENTRY_SORTS = new Set<ExpenseEntryFilters["sort"]>([
  "date-desc",
  "date-asc",
  "amount-desc",
  "amount-asc",
  "paid-to-asc",
]);

export class ExpenseSpaceQueryError extends Error {}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeName(value: string) {
  return normalizeDisplayName(value).toLocaleLowerCase("en-US");
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function escapeRegex(value: string) {
  if (value.length > 100) {
    throw new ExpenseSpaceQueryError(
      "Search text must be at most 100 characters",
    );
  }
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type TaxonomySelectionResult =
  | {
      success: true;
      category: ExpenseSpaceCategory;
      subcategory?: ExpenseSpaceCategory["subcategories"][number];
    }
  | { success: false; error: string };

export function validateTaxonomySelection(
  categories: ExpenseSpaceCategory[],
  categoryId: string,
  subcategoryId?: string,
  options: { allowInactive?: boolean } = {},
): TaxonomySelectionResult {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return { success: false, error: "Category not found" };

  const subcategory = subcategoryId
    ? category.subcategories.find((item) => item.id === subcategoryId)
    : undefined;
  if (subcategoryId && !subcategory) {
    const belongsElsewhere = categories.some((item) =>
      item.subcategories.some((candidate) => candidate.id === subcategoryId),
    );
    return {
      success: false,
      error: belongsElsewhere
        ? "Subcategory does not belong to the selected category"
        : "Subcategory not found",
    };
  }

  if (!options.allowInactive && !category.is_active) {
    return { success: false, error: "Selected category is archived" };
  }
  if (!options.allowInactive && subcategory && !subcategory.is_active) {
    return { success: false, error: "Selected subcategory is archived" };
  }

  return { success: true, category, subcategory };
}

export function findTaxonomyRemovalConflicts(
  previous: ExpenseSpaceCategory[],
  next: ExpenseSpaceCategory[],
  used: { categoryIds: Set<string>; subcategoryIds: Set<string> },
) {
  const nextCategoryIds = new Set(next.map((category) => category.id));
  const nextSubcategoryIds = new Set(
    next.flatMap((category) =>
      category.subcategories.map((subcategory) => subcategory.id),
    ),
  );
  const conflicts: string[] = [];

  for (const category of previous) {
    if (
      !nextCategoryIds.has(category.id) &&
      used.categoryIds.has(category.id)
    ) {
      conflicts.push(
        `Used category ${category.name} cannot be deleted; archive it instead`,
      );
    }
    for (const subcategory of category.subcategories) {
      if (
        !nextSubcategoryIds.has(subcategory.id) &&
        used.subcategoryIds.has(subcategory.id)
      ) {
        conflicts.push(
          `Used subcategory ${subcategory.name} cannot be deleted; archive it instead`,
        );
      }
    }
  }

  return conflicts;
}

export function currencyChangeError(
  currentCurrency: string,
  nextCurrency: string,
  entryCount: number,
) {
  if (entryCount > 0 && currentCurrency !== nextCurrency) {
    return "Currency cannot be changed after expenses have been added";
  }
  return null;
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  field: string,
  maximum?: number,
) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new ExpenseSpaceQueryError(`${field} must be a positive integer`);
  }
  const parsed = Number(value);
  if (parsed < 1 || (maximum !== undefined && parsed > maximum)) {
    throw new ExpenseSpaceQueryError(
      maximum === undefined
        ? `${field} must be a positive integer`
        : `${field} must be between 1 and ${maximum}`,
    );
  }
  return parsed;
}

function optionalDate(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (value === null) return undefined;
  if (!isCalendarDate(value)) {
    throw new ExpenseSpaceQueryError(`${key} must be a valid YYYY-MM-DD date`);
  }
  return value;
}

function optionalUuid(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (value === null) return undefined;
  if (!UUID_PATTERN.test(value)) {
    throw new ExpenseSpaceQueryError(`${key} must be a valid UUID`);
  }
  return value;
}

export function parseExpenseEntryFilters(
  params: URLSearchParams,
): ExpenseEntryFilters {
  const page = parsePositiveInteger(params.get("page"), 1, "page");
  const pageSize = parsePositiveInteger(
    params.get("page_size"),
    EXPENSE_SPACE_PAGE_SIZE,
    "page_size",
    EXPENSE_SPACE_MAX_PAGE_SIZE,
  );
  const dateFrom = optionalDate(params, "date_from");
  const dateTo = optionalDate(params, "date_to");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ExpenseSpaceQueryError("date range cannot be reversed");
  }

  const sortValue = params.get("sort") ?? "date-desc";
  if (!ENTRY_SORTS.has(sortValue as ExpenseEntryFilters["sort"])) {
    throw new ExpenseSpaceQueryError("sort is not supported");
  }

  const searchValue = params.get("search");
  const search = searchValue ? normalizeDisplayName(searchValue) : undefined;
  if (search) escapeRegex(search);

  const paidToValue = params.get("paid_to");
  const paidTo = paidToValue ? normalizeDisplayName(paidToValue) : undefined;
  if (paidTo && paidTo.length > 120) {
    throw new ExpenseSpaceQueryError("paid_to is too long");
  }

  const paymentMethodValue = params.get("payment_method");
  if (
    paymentMethodValue &&
    !EXPENSE_PAYMENT_METHODS.includes(
      paymentMethodValue as ExpensePaymentMethod,
    )
  ) {
    throw new ExpenseSpaceQueryError("payment_method is not supported");
  }

  return {
    page,
    pageSize,
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(optionalUuid(params, "category_id")
      ? { categoryId: optionalUuid(params, "category_id") }
      : {}),
    ...(optionalUuid(params, "subcategory_id")
      ? { subcategoryId: optionalUuid(params, "subcategory_id") }
      : {}),
    ...(paidTo ? { paidTo } : {}),
    ...(paymentMethodValue
      ? { paymentMethod: paymentMethodValue as ExpensePaymentMethod }
      : {}),
    sort: sortValue as ExpenseEntryFilters["sort"],
  };
}
