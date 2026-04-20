import { describe, expect, it } from "vitest";
import {
  filterPeople,
  getBirthdayDetails,
  getPeopleCounts,
  getPeopleSummary,
} from "../insights";
import type { Person } from "../types";

const people: Person[] = [
  {
    _id: "1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    payload: {
      name: "Alex Rivera",
      relationship: "friend",
      company: "Northwind",
      birthday: "1992-04-25",
      interests: ["climbing"],
      tags: ["gym"],
      social_links: [],
      interactions: [{ date: "2026-04-15", type: "message" }],
      last_contacted: "2026-04-15",
      is_favorite: true,
      documents: [],
    },
  },
  {
    _id: "2",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    payload: {
      name: "Morgan Lee",
      relationship: "colleague",
      company: "Orbit",
      birthday: "1990-07-20",
      interests: ["design"],
      tags: ["work"],
      social_links: [],
      interactions: [{ date: "2025-12-01", type: "email" }],
      last_contacted: "2025-12-01",
      is_favorite: false,
      documents: [],
    },
  },
  {
    _id: "3",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    payload: {
      name: "Jamie Stone",
      relationship: "family",
      birthday: "1988-04-20",
      interests: ["travel"],
      tags: ["family"],
      social_links: [],
      interactions: [],
      is_favorite: false,
      documents: [],
    },
  },
];

describe("people insights", () => {
  const now = new Date("2026-04-20T00:00:00.000Z");

  it("summarizes contact health and birthdays", () => {
    const summary = getPeopleSummary(people, now);

    expect(summary.total).toBe(3);
    expect(summary.favorites).toBe(1);
    expect(summary.staleCount).toBe(2);
    expect(summary.upcomingBirthdaysCount).toBe(2);
    expect(summary.nextBirthday?.name).toBe("Jamie Stone");
    expect(summary.recentlyContactedCount).toBe(1);
  });

  it("filters by upcoming birthdays and search text", () => {
    const result = filterPeople(
      people,
      {
        searchQuery: "gym",
        activeBucket: "upcoming",
        relationshipFilter: "all",
      },
      now,
    );

    expect(result).toHaveLength(1);
    expect(result[0].payload.name).toBe("Alex Rivera");
  });

  it("builds filter counts from the same summary rules", () => {
    expect(getPeopleCounts(people, now)).toEqual({
      all: 3,
      favorites: 1,
      stale: 2,
      upcoming: 2,
    });
  });

  it("calculates the next birthday window", () => {
    const details = getBirthdayDetails("1992-04-25", now);

    expect(details?.daysUntil).toBe(5);
    expect(details?.isUpcoming).toBe(true);
  });
});
