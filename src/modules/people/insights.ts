import type { ContentDocument } from "@/lib/types";
import type { Interaction, Person, PersonPayload, Relationship } from "./types";

export type PeopleFilterType = "all" | "favorites" | "upcoming" | "stale";

export const STALE_CONTACT_DAYS = 90;
export const RECENT_CONTACT_DAYS = 14;
export const UPCOMING_BIRTHDAY_WINDOW_DAYS = 30;

export interface BirthdayDetails {
  month: number;
  day: number;
  nextBirthday: string;
  daysUntil: number;
  ageTurning: number | null;
  isThisMonth: boolean;
  isUpcoming: boolean;
}

export interface PersonSummary {
  total: number;
  favorites: number;
  staleCount: number;
  healthScore: number;
  upcomingBirthdaysCount: number;
  recentlyContactedCount: number;
  nextBirthday: {
    id: string;
    name: string;
    daysUntil: number;
    date: string;
  } | null;
  stalestPerson: {
    id: string;
    name: string;
    daysSince: number | null;
  } | null;
}

type PersonLike = Pick<Person, "_id" | "payload">;

export function getDaysSinceDate(dateStr?: string, nowMs = Date.now()) {
  if (!dateStr) return null;
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((nowMs - ts) / (1000 * 60 * 60 * 24));
}

export function getBirthdayDetails(
  birthday?: string,
  now = new Date(),
): BirthdayDetails | null {
  if (!birthday) return null;

  const raw = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(raw.getTime())) return null;

  const currentYear = now.getFullYear();
  let nextBirthday = new Date(currentYear, raw.getMonth(), raw.getDate());
  if (
    nextBirthday < new Date(now.getFullYear(), now.getMonth(), now.getDate())
  ) {
    nextBirthday = new Date(currentYear + 1, raw.getMonth(), raw.getDate());
  }

  const daysUntil = Math.ceil(
    (nextBirthday.getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const birthYear = raw.getFullYear();
  const ageTurning =
    birthYear >= 1900 ? nextBirthday.getFullYear() - birthYear : null;

  return {
    month: raw.getMonth(),
    day: raw.getDate(),
    nextBirthday: nextBirthday.toISOString(),
    daysUntil,
    ageTurning,
    isThisMonth: raw.getMonth() === now.getMonth(),
    isUpcoming: daysUntil >= 0 && daysUntil <= UPCOMING_BIRTHDAY_WINDOW_DAYS,
  };
}

export function getLastInteraction(interactions: Interaction[] = []) {
  return interactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function getDerivedLastContacted(person: PersonLike) {
  return (
    person.payload.last_contacted ||
    getLastInteraction(person.payload.interactions)?.date
  );
}

export function filterPeople(
  people: Person[],
  filters: {
    searchQuery: string;
    activeBucket: PeopleFilterType;
    relationshipFilter: Relationship | "all";
  },
  now = new Date(),
) {
  const query = filters.searchQuery.trim().toLowerCase();

  return people
    .filter((person) => {
      if (!query) return true;
      const haystack = [
        person.payload.name,
        person.payload.company,
        person.payload.role,
        person.payload.email,
        person.payload.phone,
        person.payload.notes,
        ...(person.payload.interests || []),
        ...(person.payload.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    })
    .filter((person) => {
      if (filters.activeBucket === "favorites") {
        return person.payload.is_favorite;
      }

      if (filters.activeBucket === "stale") {
        const days = getDaysSinceDate(
          getDerivedLastContacted(person),
          now.getTime(),
        );
        return days === null || days > STALE_CONTACT_DAYS;
      }

      if (filters.activeBucket === "upcoming") {
        return (
          getBirthdayDetails(person.payload.birthday, now)?.isUpcoming ?? false
        );
      }

      return true;
    })
    .filter((person) => {
      if (filters.relationshipFilter === "all") return true;
      return person.payload.relationship === filters.relationshipFilter;
    })
    .sort((a, b) => {
      if (a.payload.is_favorite !== b.payload.is_favorite) {
        return a.payload.is_favorite ? -1 : 1;
      }

      const aDays = getDaysSinceDate(getDerivedLastContacted(a), now.getTime());
      const bDays = getDaysSinceDate(getDerivedLastContacted(b), now.getTime());

      if (aDays !== null && bDays !== null && aDays !== bDays) {
        return bDays - aDays;
      }

      return a.payload.name.localeCompare(b.payload.name);
    });
}

export function getPeopleSummary(
  people: Person[],
  now = new Date(),
): PersonSummary {
  const nowMs = now.getTime();
  const favorites = people.filter(
    (person) => person.payload.is_favorite,
  ).length;

  const withRecency = people.map((person) => ({
    person,
    daysSince: getDaysSinceDate(getDerivedLastContacted(person), nowMs),
    birthday: getBirthdayDetails(person.payload.birthday, now),
  }));

  const stalePeople = withRecency.filter(
    ({ daysSince }) => daysSince === null || daysSince > STALE_CONTACT_DAYS,
  );
  const upcomingBirthdays = withRecency
    .filter(({ birthday }) => birthday?.isUpcoming)
    .sort(
      (a, b) =>
        (a.birthday?.daysUntil ?? 9999) - (b.birthday?.daysUntil ?? 9999),
    );
  const recentlyContactedCount = withRecency.filter(
    ({ daysSince }) => daysSince !== null && daysSince <= RECENT_CONTACT_DAYS,
  ).length;
  const stalestPerson =
    withRecency
      .filter(({ daysSince }) => daysSince !== null)
      .sort((a, b) => (b.daysSince ?? -1) - (a.daysSince ?? -1))[0] ?? null;

  return {
    total: people.length,
    favorites,
    staleCount: stalePeople.length,
    healthScore:
      people.length === 0
        ? 0
        : Math.round(
            ((people.length - stalePeople.length) / people.length) * 100,
          ),
    upcomingBirthdaysCount: upcomingBirthdays.length,
    recentlyContactedCount,
    nextBirthday: upcomingBirthdays[0]
      ? {
          id: upcomingBirthdays[0].person._id,
          name: upcomingBirthdays[0].person.payload.name,
          daysUntil: upcomingBirthdays[0].birthday?.daysUntil ?? 0,
          date: upcomingBirthdays[0].birthday?.nextBirthday ?? "",
        }
      : null,
    stalestPerson: stalestPerson
      ? {
          id: stalestPerson.person._id,
          name: stalestPerson.person.payload.name,
          daysSince: stalestPerson.daysSince,
        }
      : null,
  };
}

export function getPeopleCounts(
  people: Person[],
  now = new Date(),
): Record<PeopleFilterType, number> {
  const summary = getPeopleSummary(people, now);

  return {
    all: summary.total,
    favorites: summary.favorites,
    stale: summary.staleCount,
    upcoming: summary.upcomingBirthdaysCount,
  };
}

export function toPersonDocument(
  doc: ContentDocument<PersonPayload> & {
    _id: { toString(): string } | string;
  },
): Person {
  return {
    ...doc,
    _id: typeof doc._id === "string" ? doc._id : doc._id.toString(),
  };
}
