import { describe, expect, it, vi } from "vitest";
import {
  getHealthAlerts,
  getNextTimelineItem,
  getProfileOverviewSnapshot,
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
});
