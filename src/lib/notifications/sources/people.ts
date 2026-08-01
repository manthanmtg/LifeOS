import type { Db } from "mongodb";

import {
  addDaysToCalendarDate,
  getCalendarDateInTimezone,
  isCandidateDue,
} from "../time";
import { PersonSchema } from "@/lib/schemas";
import type { ContentDocument } from "@/lib/types";
import {
  getBirthdayNotificationRule,
  getContactReminderNotificationRule,
  normalizePeopleSettings,
  resolvePeopleBirthdayNotificationPreferences,
  resolvePeopleContactReminderNotificationPreferences,
} from "@/lib/notifications/people-preferences";
import {
  getBirthdayOccurrenceDate,
  getCalendarDayDifference,
} from "@/modules/people/birthday";
import type {
  NotificationCandidate,
  NotificationRule,
  NotificationSource,
  NotificationSourceContext,
} from "../contracts";

type ProjectedPeoplePayload = {
  name: string;
  relationship: string;
  birthday?: string;
  last_contacted?: string;
  interactions?: Array<{ date: string; type: string; note?: string }>;
  notifications?: unknown;
};

type PeopleProjection = ContentDocument<ProjectedPeoplePayload>;

function getPeopleCollection(db: Db) {
  return db.collection<PeopleProjection>("content");
}

function formatRelationship(relationship: string) {
  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
}

function formatCalendarDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function titleForBirthdayOffset(name: string, offsetDays: number) {
  if (offsetDays === 0) return `${name}'s birthday is today`;
  if (offsetDays === 1) return `${name}'s birthday is tomorrow`;
  return `${name}'s birthday is in ${offsetDays} days`;
}

function buildBirthdayBody(occurrenceDate: string, relationship: string) {
  return `${formatCalendarDate(occurrenceDate)} · ${formatRelationship(
    relationship,
  )}`;
}

function titleForContactReminder(
  name: string,
  dueDate: string,
  localDate: string,
) {
  const daysUntilDue = getCalendarDayDifference(localDate, dueDate);
  if (daysUntilDue <= 0) return `Contact ${name} today`;
  if (daysUntilDue === 1) return `Contact ${name} tomorrow`;
  return `Contact ${name} in ${daysUntilDue} days`;
}

function buildContactReminderBody(
  lastContacted: string,
  localDate: string,
  relationship: string,
  cadenceDays: number,
) {
  const daysSinceContact = Math.max(
    0,
    getCalendarDayDifference(lastContacted, localDate),
  );

  return `Last contacted ${daysSinceContact} days ago · ${formatRelationship(
    relationship,
  )} · every ${cadenceDays} days`;
}

function addBirthdayCandidatesForOccurrence(
  candidates: NotificationCandidate[],
  person: {
    id: string;
    name: string;
    relationship: string;
    ruleOffsets: number[];
    ruleChannelIds?: string[];
    occurrenceDate: string;
  },
  context: NotificationSourceContext,
) {
  for (const offsetDays of person.ruleOffsets) {
    const scheduledDate = addDaysToCalendarDate(
      person.occurrenceDate,
      -offsetDays,
    );
    const candidate: NotificationCandidate = {
      source: {
        module_type: "person",
        document_id: person.id,
        event: "birthday",
        event_date: person.occurrenceDate,
      },
      scheduled_date: scheduledDate,
      offset_days: offsetDays,
      message: {
        title: titleForBirthdayOffset(person.name, offsetDays),
        body: buildBirthdayBody(person.occurrenceDate, person.relationship),
      },
    };

    if (person.ruleChannelIds?.length) {
      candidate.channel_ids = person.ruleChannelIds;
    }

    if (isCandidateDue(candidate, context.settings, context.now)) {
      candidates.push(candidate);
    }
  }
}

function collectBirthdayCandidateList(
  document: PeopleProjection,
  rule: NotificationRule,
  context: NotificationSourceContext,
) {
  const people: NotificationCandidate[] = [];
  const localDate = getCalendarDateInTimezone(
    context.now,
    context.settings.timezone,
  );
  const localYear = Number(localDate.slice(0, 4));
  const payload = document.payload;

  if (!payload.birthday) return people;

  for (const occurrenceYear of [localYear - 1, localYear, localYear + 1]) {
    const occurrenceDate = getBirthdayOccurrenceDate(
      payload.birthday,
      occurrenceYear,
    );
    if (!occurrenceDate) continue;

    addBirthdayCandidatesForOccurrence(
      people,
      {
        id: String(document._id),
        name: payload.name,
        relationship: payload.relationship,
        ruleOffsets: rule.offsets_days,
        ruleChannelIds: rule.channel_ids,
        occurrenceDate,
      },
      context,
    );
  }

  return people;
}

function getLatestInteractionDate(
  interactions: ProjectedPeoplePayload["interactions"] = [],
) {
  return interactions
    .map((interaction) => interaction.date)
    .sort((a, b) => b.localeCompare(a))[0];
}

function getLastContactedDate(payload: ProjectedPeoplePayload) {
  return (
    payload.last_contacted ?? getLatestInteractionDate(payload.interactions)
  );
}

function collectContactReminderCandidateList(
  document: PeopleProjection,
  rule: NotificationRule,
  context: NotificationSourceContext,
) {
  const candidates: NotificationCandidate[] = [];
  const payload = document.payload;
  const lastContacted = getLastContactedDate(payload);
  const cadenceDays = rule.cadence_days;

  if (!lastContacted || !cadenceDays) return candidates;

  const localDate = getCalendarDateInTimezone(
    context.now,
    context.settings.timezone,
  );
  const dueDate = addDaysToCalendarDate(lastContacted, cadenceDays);

  for (const offsetDays of rule.offsets_days) {
    const configuredScheduledDate = addDaysToCalendarDate(dueDate, -offsetDays);
    const scheduledDate =
      configuredScheduledDate < localDate ? localDate : configuredScheduledDate;
    const candidate: NotificationCandidate = {
      source: {
        module_type: "person",
        document_id: String(document._id),
        event: "contact_reminder",
        event_date: dueDate,
      },
      scheduled_date: scheduledDate,
      offset_days: offsetDays,
      message: {
        title: titleForContactReminder(payload.name, dueDate, localDate),
        body: buildContactReminderBody(
          lastContacted,
          localDate,
          payload.relationship,
          cadenceDays,
        ),
      },
    };

    if (rule.channel_ids?.length) {
      candidate.channel_ids = rule.channel_ids;
    }

    if (isCandidateDue(candidate, context.settings, context.now)) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

const PEOPLE_NOTIFICATION_QUERY = {
  module_type: "person",
  $or: [
    { "payload.birthday": { $exists: true } },
    { "payload.last_contacted": { $exists: true } },
    { "payload.interactions.0": { $exists: true } },
  ],
};

const PEOPLE_NOTIFICATION_PROJECTION = {
  _id: 1,
  "payload.name": 1,
  "payload.relationship": 1,
  "payload.birthday": 1,
  "payload.last_contacted": 1,
  "payload.interactions": 1,
  "payload.notifications": 1,
};

export const peopleNotificationSource: NotificationSource = {
  moduleType: "person",
  async collectCandidates(context: NotificationSourceContext) {
    const settings = normalizePeopleSettings(
      context.systemConfig.peopleSettings as unknown,
    );

    const documents = await getPeopleCollection(context.db)
      .find(PEOPLE_NOTIFICATION_QUERY, {
        projection: PEOPLE_NOTIFICATION_PROJECTION,
      })
      .toArray();

    const candidates: NotificationCandidate[] = [];
    let itemsSkipped = 0;

    for (const document of documents) {
      const parsed = PersonSchema.safeParse(document.payload);
      if (!parsed.success) {
        itemsSkipped += 1;
        continue;
      }

      if (parsed.data.birthday) {
        const resolved = resolvePeopleBirthdayNotificationPreferences(
          {
            relationship: parsed.data.relationship,
            notifications: parsed.data.notifications,
          },
          settings,
        );
        const rule = getBirthdayNotificationRule(resolved.preferences);
        if (resolved.preferences.enabled && rule) {
          candidates.push(
            ...collectBirthdayCandidateList(
              {
                ...document,
                payload: {
                  ...document.payload,
                  birthday: parsed.data.birthday,
                  name: parsed.data.name,
                  relationship: parsed.data.relationship,
                },
              },
              rule,
              context,
            ),
          );
        }
      }

      const lastContacted = getLastContactedDate(parsed.data);
      if (lastContacted) {
        const resolved = resolvePeopleContactReminderNotificationPreferences(
          {
            relationship: parsed.data.relationship,
            notifications: parsed.data.notifications,
          },
          settings,
        );
        const rule = getContactReminderNotificationRule(resolved.preferences);
        if (resolved.preferences.enabled && rule) {
          candidates.push(
            ...collectContactReminderCandidateList(
              {
                ...document,
                payload: {
                  ...document.payload,
                  interactions: parsed.data.interactions,
                  last_contacted: parsed.data.last_contacted,
                  name: parsed.data.name,
                  relationship: parsed.data.relationship,
                },
              },
              rule,
              context,
            ),
          );
        }
      }
    }

    return {
      candidates,
      items_skipped: itemsSkipped,
    };
  },

  async getActivationSummary(context: NotificationSourceContext) {
    const settings = normalizePeopleSettings(
      context.systemConfig.peopleSettings as unknown,
    );

    const documents = await getPeopleCollection(context.db)
      .find(PEOPLE_NOTIFICATION_QUERY, {
        projection: PEOPLE_NOTIFICATION_PROJECTION,
      })
      .toArray();

    let eligibleCount = 0;
    let explicitCount = 0;
    let inheritedCount = 0;

    for (const document of documents) {
      const parsed = PersonSchema.safeParse(document.payload);
      if (!parsed.success) {
        continue;
      }

      if (parsed.data.birthday) {
        const resolved = resolvePeopleBirthdayNotificationPreferences(
          {
            relationship: parsed.data.relationship,
            notifications: parsed.data.notifications,
          },
          settings,
        );
        const rule = getBirthdayNotificationRule(resolved.preferences);
        if (resolved.preferences.enabled && rule) {
          eligibleCount += 1;
          if (resolved.origin.kind === "person") {
            explicitCount += 1;
          } else {
            inheritedCount += 1;
          }
        }
      }

      if (getLastContactedDate(parsed.data)) {
        const resolved = resolvePeopleContactReminderNotificationPreferences(
          {
            relationship: parsed.data.relationship,
            notifications: parsed.data.notifications,
          },
          settings,
        );
        const rule = getContactReminderNotificationRule(resolved.preferences);
        if (resolved.preferences.enabled && rule) {
          eligibleCount += 1;
          if (resolved.origin.kind === "person") {
            explicitCount += 1;
          } else {
            inheritedCount += 1;
          }
        }
      }
    }

    return {
      module_type: "person",
      label: "People",
      eligible_count: eligibleCount,
      explicit_count: explicitCount,
      inherited_count: inheritedCount,
    };
  },
};
