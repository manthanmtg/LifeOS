import type { NumberFormat } from "@/lib/formatters";
import type { NotificationPreferences } from "@/lib/notifications/contracts";

export const RECURRING_SORT_MODES = [
  "custom",
  "name-asc",
  "name-desc",
  "cost-asc",
  "cost-desc",
  "monthly-eq-asc",
  "monthly-eq-desc",
  "renewal-asc",
  "renewal-desc",
  "category",
] as const;

export const BILLING_CYCLE_VALUES = [
  "monthly",
  "yearly",
  "weekly",
  "daily",
  "quarterly",
] as const;

export type BillingCycle = (typeof BILLING_CYCLE_VALUES)[number];
export type RecurringSortMode = (typeof RECURRING_SORT_MODES)[number];

export interface RecurringExpensePayload {
  name: string;
  cost: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_renewal_date: string;
  category: string;
  url?: string;
  is_active: boolean;
  enable_reminders: boolean;
  notifications?: NotificationPreferences;
  notes?: string;
  order?: number;
}

export interface RecurringExpense {
  _id: string;
  payload: RecurringExpensePayload;
}

export interface RecurringExpenseSettings {
  categories: string[];
  defaultCurrency: string;
  renewalWarningDays: number;
  enableReminders: boolean;
  defaultNotificationOffsetsDays: number[];
  numberFormat: NumberFormat;
  defaultSort: RecurringSortMode;
  [key: string]: unknown;
}
