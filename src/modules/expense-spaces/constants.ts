import type { ExpensePaymentMethod, ExpenseSpaceNumberFormat } from "./types";

export const EXPENSE_SPACE_PAGE_SIZE = 50;
export const EXPENSE_SPACE_MAX_PAGE_SIZE = 100;

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
  "Cash",
  "Debit Card",
  "Credit Card",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
];

export const EXPENSE_SPACE_CURRENCIES = [
  "USD",
  "INR",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "SGD",
  "AED",
] as const;

export const EXPENSE_SPACE_DATE_PRESETS = [
  "all-time",
  "this-month",
  "this-year",
  "custom",
] as const;

export const DEFAULT_EXPENSE_SPACE_FORM = {
  name: "",
  description: "",
  currency: "USD",
  number_format: "western" as ExpenseSpaceNumberFormat,
  budget_amount: "",
  budget_cadence: "total" as const,
};
