import { getDueStatus } from "./helpers";
import type {
  HealthProfile,
  ProfileType,
  Visit,
  LabResult,
  Measurement,
  HealthDocument,
} from "./types";

export interface HealthAlert {
  profileId: string;
  profileName: string;
  label: string;
  date: string;
  status: "overdue" | "warning";
}

export interface HealthTimelineItem {
  kind: "medication" | "vaccination";
  label: string;
  date: string;
  status: "overdue" | "warning" | "ok";
}

export interface ProfileOverviewSnapshot {
  activeMedicationCount: number;
  activeConditionCount: number;
  totalVisitCostInr: number;
  latestVisit: Visit | null;
  latestMeasurement: Measurement | null;
  latestLabResult: LabResult | null;
  latestDocument: HealthDocument | null;
  nextTimelineItem: HealthTimelineItem | null;
}

export type HealthListFilter = "all" | "attention" | ProfileType;

export interface HealthFilterOption {
  key: HealthListFilter;
  label: string;
  count: number;
}

export interface WeightTrendPoint {
  id: string;
  date: string;
  weightKg: number;
  heightPercent: number;
}

function byNewestDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function byNewestVisit(items: Visit[]): Visit[] {
  return [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function byNewestMeasurement(items: Measurement[]): Measurement[] {
  return [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function byNewestDocument(items: HealthDocument[]): HealthDocument[] {
  return [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

function normalizeSearchValue(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getProfileSearchText(profile: HealthProfile): string {
  const payload = profile.payload;
  return [
    payload.name,
    payload.relation,
    payload.emergency_contact,
    payload.insurance_info,
    payload.notes,
    payload.tags.join(" "),
    payload.allergies.join(" "),
    payload.conditions.map((condition) => condition.name).join(" "),
    payload.medications.map((medication) => medication.name).join(" "),
    payload.vaccinations.map((vaccination) => vaccination.name).join(" "),
    payload.visits
      .map((visit) => [visit.doctor, visit.facility, visit.diagnosis].join(" "))
      .join(" "),
    payload.lab_results.map((result) => result.test_name).join(" "),
    payload.documents.map((document) => document.title).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getProfileAlerts(profile: HealthProfile): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const payload = profile.payload;

  for (const medication of payload.medications || []) {
    if (medication.status !== "active" || !medication.refill_date) continue;
    const status = getDueStatus(medication.refill_date);
    if (status === "overdue" || status === "warning") {
      alerts.push({
        profileId: profile._id,
        profileName: payload.name,
        label: `Refill: ${medication.name}`,
        date: medication.refill_date,
        status,
      });
    }
  }

  for (const vaccination of payload.vaccinations || []) {
    if (!vaccination.next_due) continue;
    const status = getDueStatus(vaccination.next_due);
    if (status === "overdue" || status === "warning") {
      alerts.push({
        profileId: profile._id,
        profileName: payload.name,
        label: `Vaccine: ${vaccination.name}`,
        date: vaccination.next_due,
        status,
      });
    }
  }

  alerts.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (a.status !== "overdue" && b.status === "overdue") return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return alerts;
}

export function getHealthAlerts(profiles: HealthProfile[]): HealthAlert[] {
  return profiles.flatMap(getProfileAlerts);
}

export function getHealthFilterOptions(
  profiles: HealthProfile[],
): HealthFilterOption[] {
  return [
    { key: "all", label: "All", count: profiles.length },
    {
      key: "attention",
      label: "Needs Attention",
      count: profiles.filter((profile) => getProfileAlerts(profile).length > 0)
        .length,
    },
    {
      key: "self",
      label: "Self",
      count: profiles.filter((profile) => profile.payload.type === "self")
        .length,
    },
    {
      key: "family",
      label: "Family",
      count: profiles.filter((profile) => profile.payload.type === "family")
        .length,
    },
    {
      key: "pet",
      label: "Pets",
      count: profiles.filter((profile) => profile.payload.type === "pet")
        .length,
    },
  ];
}

export function filterHealthProfiles(
  profiles: HealthProfile[],
  listFilter: HealthListFilter,
  query: string,
): HealthProfile[] {
  const normalizedQuery = normalizeSearchValue(query);

  return profiles.filter((profile) => {
    if (listFilter === "attention" && getProfileAlerts(profile).length === 0) {
      return false;
    }

    if (listFilter !== "all" && listFilter !== "attention") {
      if (profile.payload.type !== listFilter) return false;
    }

    if (!normalizedQuery) return true;

    return getProfileSearchText(profile).includes(normalizedQuery);
  });
}

export function getNextTimelineItem(
  profile: HealthProfile,
): HealthTimelineItem | null {
  const upcoming: HealthTimelineItem[] = [];

  for (const medication of profile.payload.medications || []) {
    if (medication.status !== "active" || !medication.refill_date) continue;
    const status = getDueStatus(medication.refill_date);
    if (status === "none") continue;
    upcoming.push({
      kind: "medication",
      label: medication.name,
      date: medication.refill_date,
      status,
    });
  }

  for (const vaccination of profile.payload.vaccinations || []) {
    if (!vaccination.next_due) continue;
    const status = getDueStatus(vaccination.next_due);
    if (status === "none") continue;
    upcoming.push({
      kind: "vaccination",
      label: vaccination.name,
      date: vaccination.next_due,
      status,
    });
  }

  upcoming.sort((a, b) => {
    const rank = { overdue: 0, warning: 1, ok: 2 };
    if (rank[a.status] !== rank[b.status])
      return rank[a.status] - rank[b.status];
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return upcoming[0] ?? null;
}

export function getProfileOverviewSnapshot(
  profile: HealthProfile,
): ProfileOverviewSnapshot {
  const payload = profile.payload;

  return {
    activeMedicationCount: payload.medications.filter(
      (medication) => medication.status === "active",
    ).length,
    activeConditionCount: payload.conditions.filter(
      (condition) => condition.status !== "resolved",
    ).length,
    totalVisitCostInr: payload.visits.reduce((sum, visit) => {
      if (visit.cost != null && visit.currency === "INR") {
        return sum + visit.cost;
      }
      return sum;
    }, 0),
    latestVisit: byNewestVisit(payload.visits)[0] ?? null,
    latestMeasurement: byNewestMeasurement(payload.measurements)[0] ?? null,
    latestLabResult: byNewestDate(payload.lab_results)[0] ?? null,
    latestDocument: byNewestDocument(payload.documents)[0] ?? null,
    nextTimelineItem: getNextTimelineItem(profile),
  };
}

export function getMedicationCounts(profile: HealthProfile): {
  active: number;
  total: number;
} {
  return {
    active: profile.payload.medications.filter(
      (medication) => medication.status === "active",
    ).length,
    total: profile.payload.medications.length,
  };
}

export function getVaccinationDueCount(profile: HealthProfile): number {
  return profile.payload.vaccinations.filter((vaccination) => {
    if (!vaccination.next_due) return false;
    const status = getDueStatus(vaccination.next_due);
    return status === "overdue" || status === "warning";
  }).length;
}

export function getSortedLabGroups(
  profile: HealthProfile,
): Array<[string, LabResult[]]> {
  const grouped: Record<string, LabResult[]> = {};

  for (const result of profile.payload.lab_results) {
    if (!grouped[result.test_name]) grouped[result.test_name] = [];
    grouped[result.test_name].push(result);
  }

  return Object.entries(grouped)
    .map(([testName, results]): [string, LabResult[]] => [
      testName,
      byNewestDate(results),
    ])
    .sort(
      (a, b) =>
        new Date(b[1][0]?.date ?? 0).getTime() -
        new Date(a[1][0]?.date ?? 0).getTime(),
    );
}

export function getSortedMeasurements(profile: HealthProfile): Measurement[] {
  return byNewestMeasurement(profile.payload.measurements);
}

export function getWeightTrendPoints(
  profile: HealthProfile,
): WeightTrendPoint[] {
  const weightMeasurements = getSortedMeasurements(profile)
    .reverse()
    .filter((measurement) => measurement.weight_kg != null);

  if (weightMeasurements.length === 0) return [];

  const weights = weightMeasurements.map(
    (measurement) => measurement.weight_kg!,
  );
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight || 1;

  return weightMeasurements.map((measurement) => ({
    id: measurement.id,
    date: measurement.date,
    weightKg: measurement.weight_kg!,
    heightPercent: ((measurement.weight_kg! - minWeight) / range) * 80 + 20,
  }));
}

export function getSortedDocuments(profile: HealthProfile): HealthDocument[] {
  return byNewestDocument(profile.payload.documents);
}

export function getLatestVisit(profile: HealthProfile): Visit | null {
  return getProfileOverviewSnapshot(profile).latestVisit;
}

export function getLatestLabResult(profile: HealthProfile): LabResult | null {
  return getProfileOverviewSnapshot(profile).latestLabResult;
}

export function getLatestMeasurement(
  profile: HealthProfile,
): Measurement | null {
  return getProfileOverviewSnapshot(profile).latestMeasurement;
}
