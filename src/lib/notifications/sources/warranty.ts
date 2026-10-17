import type { ContentDocument } from "@/lib/types";
import type {
  NotificationCandidate,
  NotificationSource,
  NotificationSourceContext,
} from "../contracts";
import {
  addDaysToCalendarDate,
  getCalendarDateInTimezone,
  isCandidateDue,
} from "../time";

type Coverage = {
  id?: string;
  label?: string;
  start_date?: string;
  end_date?: string;
  archived?: boolean;
  reminder_enabled?: boolean;
  reminder_offsets_days?: number[];
};

function calendarDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function offsets(values?: number[]) {
  return [...new Set(values ?? [7, 30])]
    .filter(
      (offset) => Number.isInteger(offset) && offset >= 0 && offset <= 365,
    )
    .sort((left, right) => left - right)
    .slice(0, 10);
}

function title(itemName: string, days: number) {
  if (days === 0) return `${itemName} warranty expires today`;
  if (days === 1) return `${itemName} warranty expires tomorrow`;
  return `${itemName} warranty expires in ${days} days`;
}

function projectedItems(context: NotificationSourceContext) {
  return context.db.collection<ContentDocument>("content").find({
    module_type: "warranty_item",
    "payload.archived": { $ne: true },
    "payload.ownership_status": { $in: ["owned", undefined] },
  });
}

export const warrantyNotificationSource: NotificationSource = {
  moduleType: "warranty_item",
  async collectCandidates(context) {
    const records = await projectedItems(context).toArray();
    const localDate = getCalendarDateInTimezone(
      context.now,
      context.settings.timezone,
    );
    const candidates: NotificationCandidate[] = [];
    let items_skipped = 0;

    for (const record of records) {
      const payload = record.payload as {
        warranty_key?: string;
        name?: string;
        archived?: boolean;
        ownership_status?: string;
        coverages?: Coverage[];
      };
      if (
        !payload.warranty_key ||
        !payload.name ||
        payload.archived ||
        payload.ownership_status === "sold" ||
        payload.ownership_status === "retired"
      ) {
        items_skipped += 1;
        continue;
      }
      for (const coverage of payload.coverages ?? []) {
        const endDate = calendarDate(coverage.end_date);
        const startDate = calendarDate(coverage.start_date);
        if (
          !coverage.id ||
          !coverage.label ||
          !startDate ||
          !endDate ||
          coverage.archived ||
          coverage.reminder_enabled === false ||
          endDate < localDate
        )
          continue;
        for (const offset_days of offsets(coverage.reminder_offsets_days)) {
          const scheduled_date = addDaysToCalendarDate(endDate, -offset_days);
          if (scheduled_date < startDate) continue;
          const candidate: NotificationCandidate = {
            source: {
              module_type: "warranty_item",
              document_id: payload.warranty_key,
              event: `warranty_expiry:${coverage.id}`,
              event_date: endDate,
            },
            scheduled_date,
            offset_days,
            message: {
              title: title(
                payload.name,
                Math.round(
                  (Date.parse(`${endDate}T00:00:00Z`) -
                    Date.parse(`${localDate}T00:00:00Z`)) /
                    86_400_000,
                ),
              ),
              body: `${coverage.label} coverage · expires ${endDate}`,
              url: `/admin/warranty?item=${String(record._id)}`,
            },
          };
          if (isCandidateDue(candidate, context.settings, context.now))
            candidates.push(candidate);
        }
      }
    }
    return { candidates, items_skipped };
  },
  async getActivationSummary(context) {
    const records = await projectedItems(context).toArray();
    let eligible_count = 0;
    for (const record of records) {
      const payload = record.payload as {
        archived?: boolean;
        ownership_status?: string;
        coverages?: Coverage[];
      };
      if (
        payload.archived ||
        payload.ownership_status === "sold" ||
        payload.ownership_status === "retired"
      )
        continue;
      eligible_count += (payload.coverages ?? []).filter((coverage) =>
        Boolean(
          coverage.id &&
          coverage.label &&
          calendarDate(coverage.start_date) &&
          calendarDate(coverage.end_date) &&
          !coverage.archived &&
          coverage.reminder_enabled !== false,
        ),
      ).length;
    }
    return {
      module_type: "warranty_item",
      label: "Warranty expiry",
      eligible_count,
      explicit_count: eligible_count,
      inherited_count: 0,
    };
  },
};
