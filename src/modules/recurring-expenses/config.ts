import { DEFAULT_RECURRING_NOTIFICATION_OFFSETS } from "@/lib/notifications/contracts";
import type { RecurringExpenseSettings } from "./types";
import { BILLING_CYCLE_VALUES } from "./types";

export const BILLING_CYCLES = BILLING_CYCLE_VALUES;

export const DEFAULT_RECURRING_EXPENSE_CATEGORIES = [
  "Streaming",
  "Cloud/SaaS",
  "Music",
  "News",
  "Gaming",
  "Fitness",
  "Productivity",
  "Insurance",
  "Investment",
  "Housing",
  "Utilities",
  "Memberships",
  "Education",
  "Health",
  "EMI",
  "Other",
];

export const RECURRING_EXPENSE_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "BRL",
];

export const RECURRING_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  BRL: "R$",
};

export const RECURRING_EXPENSE_SETTINGS_DEFAULTS: RecurringExpenseSettings = {
  categories: DEFAULT_RECURRING_EXPENSE_CATEGORIES,
  defaultCurrency: "USD",
  renewalWarningDays: 7,
  enableReminders: true,
  defaultNotificationOffsetsDays: DEFAULT_RECURRING_NOTIFICATION_OFFSETS,
  numberFormat: "western",
  defaultSort: "custom",
};

export function getRecurringCurrencySymbol(currency: string): string {
  return RECURRING_CURRENCY_SYMBOLS[currency] || currency;
}
