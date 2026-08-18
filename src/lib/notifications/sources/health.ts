import type { Db } from "mongodb";

import { HealthProfileSchema } from "@/lib/schemas";
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

const DEFAULT_VACCINATION_REMINDER_OFFSETS = [30, 7, 1];

function getContentCollection(db: Db) {
  return db.collection<ContentDocument>("content");
}

function calendarDate(value?: string) {
  const date = value?.slice(0, 10);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function reminderOffsets(offsets?: number[]) {
  const values = offsets || DEFAULT_VACCINATION_REMINDER_OFFSETS;
  return [...new Set(values)]
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 3650)
    .sort((a, b) => a - b)
    .slice(0, 10);
}

function titleForVaccination(
  name: string,
  profileName: string,
  dueDate: string,
  localDate: string,
) {
  const days = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) -
      Date.parse(`${localDate}T00:00:00Z`)) /
      86_400_000,
  );
  if (days < 0) return `${name} for ${profileName} is overdue`;
  if (days === 0) return `${name} for ${profileName} is due today`;
  if (days === 1) return `${name} for ${profileName} is due tomorrow`;
  return `${name} for ${profileName} is due in ${days} days`;
}

export const healthNotificationSource: NotificationSource = {
  moduleType: "health_profile",
  async collectCandidates(context: NotificationSourceContext) {
    const records = await getContentCollection(context.db)
      .find({
        module_type: "health_profile",
        "payload.vaccinations.0": { $exists: true },
      })
      .toArray();
    const candidates: NotificationCandidate[] = [];
    const localDate = getCalendarDateInTimezone(
      context.now,
      context.settings.timezone,
    );
    let items_skipped = 0;

    for (const record of records) {
      const parsed = HealthProfileSchema.safeParse(record.payload);
      if (!parsed.success) {
        items_skipped += 1;
        continue;
      }
      for (const vaccination of parsed.data.vaccinations) {
        const dueDate = calendarDate(vaccination.next_due);
        if (!dueDate || vaccination.reminder_enabled === false) continue;
        for (const offset_days of reminderOffsets(
          vaccination.reminder_offsets_days,
        )) {
          const configuredDate = addDaysToCalendarDate(dueDate, -offset_days);
          const candidate: NotificationCandidate = {
            source: {
              module_type: "health_profile",
              document_id: String(record._id),
              event: `vaccination:${vaccination.id}`,
              event_date: dueDate,
            },
            scheduled_date:
              configuredDate < localDate ? localDate : configuredDate,
            offset_days,
            message: {
              title: titleForVaccination(
                vaccination.name,
                parsed.data.name,
                dueDate,
                localDate,
              ),
              body: `${parsed.data.name} · next dose ${dueDate}`,
              url: "/admin/health",
            },
          };
          if (isCandidateDue(candidate, context.settings, context.now))
            candidates.push(candidate);
        }
      }
    }
    return { candidates, items_skipped };
  },
  async getActivationSummary(context: NotificationSourceContext) {
    const records = await getContentCollection(context.db)
      .find({
        module_type: "health_profile",
        "payload.vaccinations.0": { $exists: true },
      })
      .toArray();
    let eligible_count = 0;
    for (const record of records) {
      const parsed = HealthProfileSchema.safeParse(record.payload);
      if (!parsed.success) continue;
      eligible_count += parsed.data.vaccinations.filter(
        (vaccination) =>
          Boolean(vaccination.next_due) &&
          vaccination.reminder_enabled !== false,
      ).length;
    }
    return {
      module_type: "health_profile",
      label: "Health vaccinations",
      eligible_count,
      explicit_count: eligible_count,
      inherited_count: 0,
    };
  },
};
