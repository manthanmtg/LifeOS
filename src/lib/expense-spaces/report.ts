import "server-only";

import type {
  ExpenseSpaceEntryPayload,
  ExpenseSpaceNumberFormat,
  ExpenseSpacePayload,
} from "@/modules/expense-spaces/types";

type ReportSpace = {
  _id: string;
  payload: Pick<
    ExpenseSpacePayload,
    "space_key" | "name" | "currency" | "number_format" | "budget" | "categories"
  >;
};
type ReportEntry = {
  _id: string;
  payload: Pick<
    ExpenseSpaceEntryPayload,
    | "amount"
    | "currency"
    | "description"
    | "paid_to"
    | "category_id"
    | "subcategory_id"
    | "payment_method"
    | "date"
  >;
};

export interface ExpenseSpaceReportRow {
  id: string;
  date: string;
  description: string;
  paidTo: string;
  category: string;
  subcategory: string;
  paymentMethod: string;
  amount: number;
  formattedAmount: string;
}

interface ReportBreakdown {
  name: string;
  amount: number;
  count: number;
  formattedAmount: string;
}

export interface ExpenseSpaceReport {
  spaceName: string;
  currency: string;
  numberFormat: ExpenseSpaceNumberFormat;
  generatedAt: Date;
  range: { from: string | null; to: string | null };
  metrics: { total: number; count: number; average: number; budgetPercent: number | null };
  ledger: ExpenseSpaceReportRow[];
  categoryBreakdown: ReportBreakdown[];
  subcategoryBreakdown: ReportBreakdown[];
  payeeBreakdown: ReportBreakdown[];
  paymentMethodBreakdown: ReportBreakdown[];
  monthlyBreakdown: ReportBreakdown[];
}

export interface ExpenseSpaceReportInput {
  space: ReportSpace;
  entries: ReportEntry[];
  generatedAt: Date;
}

export function formatExpenseReportMoney(
  amount: number,
  currency: string,
  numberFormat: ExpenseSpaceNumberFormat,
) {
  return new Intl.NumberFormat(numberFormat === "indian" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function addBreakdown(map: Map<string, { amount: number; count: number }>, name: string, amount: number) {
  const value = map.get(name) ?? { amount: 0, count: 0 };
  value.amount += amount;
  value.count += 1;
  map.set(name, value);
}

function asBreakdown(map: Map<string, { amount: number; count: number }>, currency: string, numberFormat: ExpenseSpaceNumberFormat) {
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      ...value,
      formattedAmount: formatExpenseReportMoney(value.amount, currency, numberFormat),
    }))
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));
}

export function buildExpenseSpaceReport({ space, entries, generatedAt }: ExpenseSpaceReportInput): ExpenseSpaceReport {
  const { payload } = space;
  const categoryBreakdown = new Map<string, { amount: number; count: number }>();
  const subcategoryBreakdown = new Map<string, { amount: number; count: number }>();
  const payeeBreakdown = new Map<string, { amount: number; count: number }>();
  const paymentMethodBreakdown = new Map<string, { amount: number; count: number }>();
  const monthlyBreakdown = new Map<string, { amount: number; count: number }>();
  const ledger = [...entries]
    .sort((left, right) => right.payload.date.localeCompare(left.payload.date) || right._id.localeCompare(left._id))
    .map((entry) => {
      const category = payload.categories.find((item) => item.id === entry.payload.category_id);
      const categoryName = category?.name ?? "Unknown category";
      const subcategory = entry.payload.subcategory_id
        ? category?.subcategories.find((item) => item.id === entry.payload.subcategory_id)
        : undefined;
      const subcategoryName = entry.payload.subcategory_id
        ? (subcategory?.name ?? "Unknown subcategory")
        : "No subcategory";
      const amount = entry.payload.amount;
      addBreakdown(categoryBreakdown, categoryName, amount);
      addBreakdown(subcategoryBreakdown, `${categoryName} / ${subcategoryName}`, amount);
      addBreakdown(payeeBreakdown, entry.payload.paid_to, amount);
      addBreakdown(paymentMethodBreakdown, entry.payload.payment_method ?? "Not specified", amount);
      addBreakdown(monthlyBreakdown, entry.payload.date.slice(0, 7), amount);
      return {
        id: entry._id,
        date: entry.payload.date,
        description: entry.payload.description,
        paidTo: entry.payload.paid_to,
        category: categoryName,
        subcategory: subcategoryName,
        paymentMethod: entry.payload.payment_method ?? "Not specified",
        amount,
        formattedAmount: formatExpenseReportMoney(amount, payload.currency, payload.number_format),
      };
    });
  const total = ledger.reduce((sum, item) => sum + item.amount, 0);
  const dates = ledger.map((item) => item.date).sort();
  const budgetSpend = payload.budget?.cadence === "monthly"
    ? ledger.filter((item) => item.date.startsWith(generatedAt.toISOString().slice(0, 7))).reduce((sum, item) => sum + item.amount, 0)
    : total;

  return {
    spaceName: payload.name,
    currency: payload.currency,
    numberFormat: payload.number_format,
    generatedAt,
    range: { from: dates[0] ?? null, to: dates.at(-1) ?? null },
    metrics: {
      total,
      count: ledger.length,
      average: ledger.length ? total / ledger.length : 0,
      budgetPercent: payload.budget ? (budgetSpend / payload.budget.amount) * 100 : null,
    },
    ledger,
    categoryBreakdown: asBreakdown(categoryBreakdown, payload.currency, payload.number_format),
    subcategoryBreakdown: asBreakdown(subcategoryBreakdown, payload.currency, payload.number_format),
    payeeBreakdown: asBreakdown(payeeBreakdown, payload.currency, payload.number_format),
    paymentMethodBreakdown: asBreakdown(paymentMethodBreakdown, payload.currency, payload.number_format),
    monthlyBreakdown: asBreakdown(monthlyBreakdown, payload.currency, payload.number_format).sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export function createExpenseSpaceReportFilename(spaceName: string, generatedAt: Date) {
  const slug = spaceName.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
  return `expense-space-${slug}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}
