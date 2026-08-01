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
  normalizePeopleSettings,
  resolvePeopleBirthdayNotificationPreferences,
} from "@/lib/notifications/people-preferences";
import { getBirthdayOccurrenceDate } from "@/modules/people/birthday";
import type {
  NotificationCandidate,
  NotificationSource,
  NotificationSourceContext,
} from "../contracts";

type ProjectedPeoplePayload = {
  name: string;
  relationship: string;
  birthday: string;
  notifications?: unknown;
};

type PeopleProjection = ContentDocument<ProjectedPeoplePayload>;

function getPeopleCollection(db: Db) {
  return db.collection<PeopleProjection>("content");
}

function titleForBirthdayOffset(name: string, offsetDays: number) {
  if (offsetDays === 0) return `${name}'s birthday is today`;
  if (offsetDays === 1) return `${name}'s birthday is tomorrow`;
  return `${name}'s birthday is in ${offsetDays} days`;
}

function buildBirthdayBody(occurrenceDate: string, relationship: string) {
  const date = new Date(`${occurrenceDate}T00:00:00.000Z`);
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedRelationship =
    relationship.charAt(0).toUpperCase() + relationship.slice(1);

  return `${formattedDate} · ${formattedRelationship}`;
}

function addCandidatesForOccurrence(
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

function collectCandidateList(
  document: PeopleProjection,
  offsets: number[],
  ruleChannelIds: string[] | undefined,
  context: NotificationSourceContext,
) {
  const people: NotificationCandidate[] = [];
  const localDate = getCalendarDateInTimezone(
    context.now,
    context.settings.timezone,
  );
  const localYear = Number(localDate.slice(0, 4));
  const payload = document.payload;

  for (const occurrenceYear of [localYear - 1, localYear, localYear + 1]) {
    const occurrenceDate = getBirthdayOccurrenceDate(
      payload.birthday,
      occurrenceYear,
    );
    if (!occurrenceDate) continue;

    addCandidatesForOccurrence(
      people,
      {
        id: String(document._id),
        name: payload.name,
        relationship: payload.relationship,
        ruleOffsets: offsets,
        ruleChannelIds,
        occurrenceDate,
      },
      context,
    );
  }

  return people;
}

export const peopleNotificationSource: NotificationSource = {
  moduleType: "person",
  async collectCandidates(context: NotificationSourceContext) {
    const settings = normalizePeopleSettings(
      context.systemConfig.peopleSettings as unknown,
    );

    const documents = await getPeopleCollection(context.db)
      .find(
        {
          module_type: "person",
          "payload.birthday": { $exists: true },
        },
        {
          projection: {
            _id: 1,
            "payload.name": 1,
            "payload.relationship": 1,
            "payload.birthday": 1,
            "payload.notifications": 1,
          },
        },
      )
      .toArray();

    const candidates: NotificationCandidate[] = [];
    let itemsSkipped = 0;

    for (const document of documents) {
      const parsed = PersonSchema.safeParse(document.payload);
      if (!parsed.success) {
        itemsSkipped += 1;
        continue;
      }

      if (!parsed.data.birthday) continue;

      const resolved = resolvePeopleBirthdayNotificationPreferences(
        {
          relationship: parsed.data.relationship,
          notifications: parsed.data.notifications,
        },
        settings,
      );
      const rule = getBirthdayNotificationRule(resolved.preferences);
      if (!resolved.preferences.enabled || !rule) {
        continue;
      }

      const personCandidates = collectCandidateList(
        document,
        rule.offsets_days,
        rule.channel_ids,
        context,
      );
      candidates.push(...personCandidates);
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
      .find(
        {
          module_type: "person",
          "payload.birthday": { $exists: true },
        },
        {
          projection: {
            _id: 1,
            "payload.name": 1,
            "payload.relationship": 1,
            "payload.birthday": 1,
            "payload.notifications": 1,
          },
        },
      )
      .toArray();

    let eligibleCount = 0;
    let explicitCount = 0;
    let inheritedCount = 0;

    for (const document of documents) {
      const parsed = PersonSchema.safeParse(document.payload);
      if (!parsed.success) {
        continue;
      }

      if (!parsed.data.birthday) continue;

      const resolved = resolvePeopleBirthdayNotificationPreferences(
        {
          relationship: parsed.data.relationship,
          notifications: parsed.data.notifications,
        },
        settings,
      );
      const rule = getBirthdayNotificationRule(resolved.preferences);
      if (!resolved.preferences.enabled || !rule) {
        continue;
      }

      eligibleCount += 1;
      if (resolved.origin.kind === "person") {
        explicitCount += 1;
      } else {
        inheritedCount += 1;
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
