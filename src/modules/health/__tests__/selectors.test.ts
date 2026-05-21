import { describe, expect, it, vi } from "vitest";
import {
  filterHealthProfiles,
  getLatestVisit,
  getMedicationCounts,
  getSortedDocuments,
  getSortedLabGroups,
  getHealthFilterOptions,
  getHealthAlerts,
  getNextTimelineItem,
  getProfileOverviewSnapshot,
  getWeightTrendPoints,
} from "../components/selectors";
import type { HealthProfile } from "../components/types";

function makeProfile(overrides?: Partial<HealthProfile>): HealthProfile {
  return {
    _id: "profile-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    payload: {
      name: "Aarav",
      type: "self",
      blood_group: "O+",
      allergies: [],
      conditions: [],
      medications: [],
      vaccinations: [],
      visits: [],
      lab_results: [],
      measurements: [],
      documents: [],
      tags: [],
    },
    ...overrides,
  };
}

describe("health selectors", () => {
  it("sorts health alerts with overdue items first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T00:00:00.000Z"));

    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        medications: [
          {
            id: "med-1",
            name: "Vitamin D",
            status: "active",
            refill_date: "2026-04-16T00:00:00.000Z",
          },
        ],
        vaccinations: [
          {
            id: "vac-1",
            name: "Flu Shot",
            date_administered: "2025-11-01T00:00:00.000Z",
            next_due: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    });

    const alerts = getHealthAlerts([profile]);

    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({
      label: "Refill: Vitamin D",
      status: "overdue",
    });
    expect(alerts[1]).toMatchObject({
      label: "Vaccine: Flu Shot",
      status: "warning",
    });

    vi.useRealTimers();
  });

  it("picks the most urgent next timeline item", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T00:00:00.000Z"));

    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        medications: [
          {
            id: "med-1",
            name: "Metformin",
            status: "active",
            refill_date: "2026-05-05T00:00:00.000Z",
          },
        ],
        vaccinations: [
          {
            id: "vac-1",
            name: "Rabies",
            date_administered: "2025-05-01T00:00:00.000Z",
            next_due: "2026-04-18T00:00:00.000Z",
          },
        ],
      },
    });

    expect(getNextTimelineItem(profile)).toMatchObject({
      kind: "vaccination",
      label: "Rabies",
      status: "overdue",
    });

    vi.useRealTimers();
  });

  it("builds an overview snapshot from the latest profile records", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        conditions: [
          { id: "cond-1", name: "Asthma", status: "active" },
          { id: "cond-2", name: "Cold", status: "resolved" },
        ],
        medications: [
          { id: "med-1", name: "Inhaler", status: "active" },
          { id: "med-2", name: "Antibiotic", status: "completed" },
        ],
        visits: [
          {
            id: "visit-1",
            date: "2026-01-14T00:00:00.000Z",
            type: "checkup",
            currency: "INR",
            cost: 900,
          },
          {
            id: "visit-2",
            date: "2026-03-20T00:00:00.000Z",
            type: "follow_up",
            currency: "USD",
            cost: 25,
          },
        ],
        lab_results: [
          {
            id: "lab-1",
            date: "2026-03-01T00:00:00.000Z",
            test_name: "HbA1c",
            value: "5.8",
            status: "normal",
          },
          {
            id: "lab-2",
            date: "2026-04-01T00:00:00.000Z",
            test_name: "HbA1c",
            value: "6.1",
            status: "borderline",
          },
        ],
        measurements: [
          { id: "m-1", date: "2026-02-01T00:00:00.000Z", weight_kg: 82 },
          { id: "m-2", date: "2026-04-10T00:00:00.000Z", weight_kg: 79 },
        ],
        documents: [
          { id: "doc-1", type: "bill", title: "Invoice", attachments: [] },
          {
            id: "doc-2",
            type: "lab_report",
            title: "HbA1c Report",
            date: "2026-04-02T00:00:00.000Z",
            attachments: [],
          },
        ],
      },
    });

    const snapshot = getProfileOverviewSnapshot(profile);

    expect(snapshot.activeConditionCount).toBe(1);
    expect(snapshot.activeMedicationCount).toBe(1);
    expect(snapshot.totalVisitCostInr).toBe(900);
    expect(snapshot.latestVisit?.id).toBe("visit-2");
    expect(snapshot.latestLabResult?.id).toBe("lab-2");
    expect(snapshot.latestMeasurement?.id).toBe("m-2");
    expect(snapshot.latestDocument?.id).toBe("doc-2");
  });

  it("filters profiles by attention and free-text search", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T00:00:00.000Z"));

    const profiles = [
      makeProfile({
        _id: "profile-1",
        payload: {
          ...makeProfile().payload,
          name: "Aarav",
          medications: [
            {
              id: "med-1",
              name: "Metformin",
              status: "active",
              refill_date: "2026-04-18T00:00:00.000Z",
            },
          ],
        },
      }),
      makeProfile({
        _id: "profile-2",
        payload: {
          ...makeProfile().payload,
          name: "Milo",
          type: "pet",
          tags: ["dog"],
          vaccinations: [
            {
              id: "vac-1",
              name: "Rabies",
              date_administered: "2025-05-01T00:00:00.000Z",
              next_due: "2026-07-01T00:00:00.000Z",
            },
          ],
        },
      }),
    ];

    expect(filterHealthProfiles(profiles, "attention", "")).toHaveLength(1);
    expect(filterHealthProfiles(profiles, "all", "rabies")[0]?._id).toBe(
      "profile-2",
    );
    expect(filterHealthProfiles(profiles, "pet", "dog")[0]?._id).toBe(
      "profile-2",
    );

    vi.useRealTimers();
  });

  it("matches document attachment filenames in free-text search", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        documents: [
          {
            id: "doc-1",
            type: "lab_report",
            title: "Annual labs",
            attachments: [
              {
                id: "att-1",
                filename: "hemoglobin-a1c-results.pdf",
                content_type: "application/pdf",
                data: "base64",
                size: 42,
                uploaded_at: "2026-04-01T00:00:00.000Z",
              },
            ],
          },
        ],
      },
    });

    expect(filterHealthProfiles([profile], "all", "a1c-results")[0]?._id).toBe(
      "profile-1",
    );
  });

  it("builds filter counts for the list toolbar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T00:00:00.000Z"));

    const profiles = [
      makeProfile(),
      makeProfile({
        _id: "profile-2",
        payload: {
          ...makeProfile().payload,
          type: "family",
          medications: [
            {
              id: "med-1",
              name: "Vitamin D",
              status: "active",
              refill_date: "2026-04-15T00:00:00.000Z",
            },
          ],
        },
      }),
      makeProfile({
        _id: "profile-3",
        payload: {
          ...makeProfile().payload,
          type: "pet",
        },
      }),
    ];

    expect(getHealthFilterOptions(profiles)).toEqual([
      { key: "all", label: "All", count: 3 },
      { key: "attention", label: "Needs Attention", count: 1 },
      { key: "self", label: "Self", count: 1 },
      { key: "family", label: "Family", count: 1 },
      { key: "pet", label: "Pets", count: 1 },
    ]);

    vi.useRealTimers();
  });

  it("calculates normalized weight trend points", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        measurements: [
          { id: "m-1", date: "2026-01-01T00:00:00.000Z", weight_kg: 82 },
          { id: "m-2", date: "2026-02-01T00:00:00.000Z", weight_kg: 79 },
          { id: "m-3", date: "2026-03-01T00:00:00.000Z", weight_kg: 80.5 },
        ],
      },
    });

    expect(getWeightTrendPoints(profile)).toEqual([
      {
        id: "m-1",
        date: "2026-01-01T00:00:00.000Z",
        weightKg: 82,
        heightPercent: 100,
      },
      {
        id: "m-2",
        date: "2026-02-01T00:00:00.000Z",
        weightKg: 79,
        heightPercent: 20,
      },
      {
        id: "m-3",
        date: "2026-03-01T00:00:00.000Z",
        weightKg: 80.5,
        heightPercent: 60,
      },
    ]);
  });

  it("sorts lab results into latest-first groups by test name", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        lab_results: [
          {
            id: "lab-1",
            date: "2026-01-05T00:00:00.000Z",
            test_name: "HbA1c",
            value: "5.8",
            status: "normal",
          },
          {
            id: "lab-2",
            date: "2025-12-15T00:00:00.000Z",
            test_name: "HbA1c",
            value: "6.0",
            status: "borderline",
          },
          {
            id: "lab-3",
            date: "2026-02-01T00:00:00.000Z",
            test_name: "Vitamin D",
            value: "32",
            status: "normal",
          },
        ],
      },
    });

    expect(getSortedLabGroups(profile)).toEqual([
      [
        "HbA1c",
        [
          {
            id: "lab-1",
            date: "2026-01-05T00:00:00.000Z",
            test_name: "HbA1c",
            value: "5.8",
            status: "normal",
          },
          {
            id: "lab-2",
            date: "2025-12-15T00:00:00.000Z",
            test_name: "HbA1c",
            value: "6.0",
            status: "borderline",
          },
        ],
      ],
      [
        "Vitamin D",
        [
          {
            id: "lab-3",
            date: "2026-02-01T00:00:00.000Z",
            test_name: "Vitamin D",
            value: "32",
            status: "normal",
          },
        ],
      ],
    ]);
  });

  it("places untimestamped documents last while sorting documents newest first", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        documents: [
          {
            id: "doc-1",
            type: "lab_report",
            title: "Missing Date Lab Report",
            attachments: [],
          },
          {
            id: "doc-2",
            type: "bill",
            title: "Recent Invoice",
            date: "2026-04-10T00:00:00.000Z",
            attachments: [],
          },
          {
            id: "doc-3",
            type: "bill",
            title: "Older Invoice",
            date: "2026-01-20T00:00:00.000Z",
            attachments: [],
          },
        ],
      },
    });

    const sorted = getSortedDocuments(profile);

    expect(sorted.map((document) => document.id)).toEqual([
      "doc-2",
      "doc-3",
      "doc-1",
    ]);
  });

  it("reports active and total medication counts", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        medications: [
          {
            id: "med-1",
            name: "Metformin",
            status: "active",
          },
          {
            id: "med-2",
            name: "Ibuprofen",
            status: "completed",
          },
          {
            id: "med-3",
            name: "Aspirin",
            status: "active",
          },
        ],
      },
    });

    expect(getMedicationCounts(profile)).toEqual({
      active: 2,
      total: 3,
    });
  });

  it("returns the latest visit even when earlier records are invalid", () => {
    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        visits: [
          {
            id: "visit-1",
            date: "not-a-date",
            type: "checkup",
            currency: "INR",
          },
          {
            id: "visit-2",
            date: "2026-02-02T00:00:00.000Z",
            type: "follow_up",
            currency: "INR",
          },
        ],
      },
    });

    expect(getLatestVisit(profile)?.id).toBe("visit-2");
  });

  it("ignores malformed due-date fields when resolving due items", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T00:00:00.000Z"));

    const profile = makeProfile({
      payload: {
        ...makeProfile().payload,
        medications: [
          {
            id: "med-1",
            name: "Aspirin",
            status: "active",
            refill_date: "invalid-date",
          },
        ],
        vaccinations: [
          {
            id: "vac-1",
            name: "Flu",
            date_administered: "2026-02-02T00:00:00.000Z",
            next_due: "not-a-date",
          },
        ],
      },
    });

    expect(getHealthAlerts([profile])).toEqual([]);
    expect(getNextTimelineItem(profile)).toBeNull();
    vi.useRealTimers();
  });
});
