import type { Db } from "mongodb";

import { RecurringExpenseSchema } from "@/lib/schemas";
import type { ContentDocument, SystemConfig } from "@/lib/types";

import type {
  NotificationCandidate,
  NotificationSource,
  NotificationSourceContext,
} from "../contracts";
import { DEFAULT_RECURRING_NOTIFICATION_OFFSETS } from "../contracts";
import {
  buildRecurringRenewalNotificationPreferences,
  getRecurringRenewalOffsets,
  normalizeNotificationOffsetsDays,
  resolveRecurringExpenseNotificationPreferences,
} from "../recurring-preferences";
import { addDaysToCalendarDate, isCandidateDue } from "../time";

export {
  buildRecurringRenewalNotificationPreferences,
  getRecurringRenewalOffsets,
  normalizeNotificationOffsetsDays,
  resolveRecurringExpenseNotificationPreferences,
};

interface RecurringExpenseSettings {
  defaultNotificationOffsetsDays?: unknown;
}

function getDefaultOffsets(systemConfig: SystemConfig): number[] {
  const moduleSettings = systemConfig.recurringExpenseSettings as
    | RecurringExpenseSettings
    | undefined;
  return normalizeNotificationOffsetsDays(
    moduleSettings?.defaultNotificationOffsetsDays,
    DEFAULT_RECURRING_NOTIFICATION_OFFSETS,
  );
}

function getContentCollection(db: Db) {
  return db.collection<ContentDocument>("content");
}

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function titleForOffset(name: string, offsetDays: number) {
  if (offsetDays === 0) return `${name} renews today`;
  if (offsetDays === 1) return `${name} renews tomorrow`;
  return `${name} renews in ${offsetDays} days`;
}

function formatCycle(cycle: string) {
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function formatEventDate(calendarDate: string) {
  return new Date(`${calendarDate}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildCandidate(
  document: ContentDocument,
  payload: ReturnType<typeof RecurringExpenseSchema.parse>,
  offsetDays: number,
): NotificationCandidate | null {
  const eventDate = payload.next_renewal_date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null;

  const scheduledDate = addDaysToCalendarDate(eventDate, -offsetDays);
  const message = {
    title: titleForOffset(payload.name, offsetDays),
    body: [
      `${formatCurrency(payload.cost, payload.currency)} · ${formatCycle(
        payload.billing_cycle,
      )} · ${formatEventDate(eventDate)}`,
      payload.category,
    ].join("\n"),
    ...(isHttpUrl(payload.url) ? { url: payload.url } : {}),
  };

  return {
    source: {
      module_type: "recurring_expense",
      document_id: String(document._id),
      event: "renewal",
      event_date: eventDate,
    },
    scheduled_date: scheduledDate,
    offset_days: offsetDays,
    message,
  };
}

async function readActiveRecurringExpenses(db: Db) {
  return getContentCollection(db)
    .find({
      module_type: "recurring_expense",
      "payload.is_active": { $ne: false },
    })
    .toArray();
}

export const recurringExpensesNotificationSource: NotificationSource = {
  moduleType: "recurring_expense",
  async collectCandidates(context: NotificationSourceContext) {
    const records = await readActiveRecurringExpenses(context.db);
    const defaultOffsets = getDefaultOffsets(context.systemConfig);
    const candidates: NotificationCandidate[] = [];
    let itemsSkipped = 0;

    for (const record of records) {
      const parsed = RecurringExpenseSchema.safeParse(record.payload);
      if (!parsed.success) {
        itemsSkipped += 1;
        continue;
      }

      const payload = parsed.data;
      if (payload.is_active === false) continue;

      const preferences = resolveRecurringExpenseNotificationPreferences(
        payload,
        defaultOffsets,
      );
      if (!preferences.enabled) continue;

      const offsets = getRecurringRenewalOffsets(preferences, defaultOffsets);
      for (const offsetDays of offsets) {
        const candidate = buildCandidate(record, payload, offsetDays);
        if (!candidate) {
          itemsSkipped += 1;
          continue;
        }
        if (isCandidateDue(candidate, context.settings, context.now)) {
          candidates.push(candidate);
        }
      }
    }

    return { candidates, items_skipped: itemsSkipped };
  },
  async getActivationSummary(context: NotificationSourceContext) {
    const records = await readActiveRecurringExpenses(context.db);
    const defaultOffsets = getDefaultOffsets(context.systemConfig);
    let eligibleCount = 0;
    let explicitCount = 0;
    let legacyCount = 0;

    for (const record of records) {
      const parsed = RecurringExpenseSchema.safeParse(record.payload);
      if (!parsed.success || parsed.data.is_active === false) continue;

      const explicit = record.payload
        ? typeof record.payload === "object" &&
          "notifications" in record.payload
        : false;
      const preferences = resolveRecurringExpenseNotificationPreferences(
        record.payload,
        defaultOffsets,
      );

      if (!preferences.enabled) continue;
      eligibleCount += 1;
      if (explicit) explicitCount += 1;
      else legacyCount += 1;
    }

    return {
      module_type: "recurring_expense",
      label: "Recurring Expenses",
      eligible_count: eligibleCount,
      explicit_count: explicitCount,
      legacy_count: legacyCount,
    };
  },
};
