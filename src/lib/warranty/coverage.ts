export type WarrantyCoverageStatus =
  | "unknown"
  | "upcoming"
  | "active"
  | "expiring"
  | "expired";

export interface WarrantyCoverageLike {
  id?: string;
  label: string;
  start_date?: string;
  end_date?: string;
  archived?: boolean;
}

export interface WarrantyItemLike {
  _id: string;
  payload: {
    name: string;
    ownership_status?: "owned" | "sold" | "retired";
    archived?: boolean;
    coverages?: WarrantyCoverageLike[];
  };
}

export interface CoverageStatus {
  status: WarrantyCoverageStatus;
  daysRemaining: number | null;
}

function daysBetween(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  );
}

export function getCoverageStatus(
  coverage: WarrantyCoverageLike,
  today: string,
): CoverageStatus {
  if (!coverage.start_date || !coverage.end_date) {
    return { status: "unknown", daysRemaining: null };
  }

  if (coverage.start_date > today) {
    return {
      status: "upcoming",
      daysRemaining: daysBetween(today, coverage.end_date),
    };
  }

  const daysRemaining = daysBetween(today, coverage.end_date);
  if (daysRemaining < 0) return { status: "expired", daysRemaining };
  if (daysRemaining <= 30) return { status: "expiring", daysRemaining };
  return { status: "active", daysRemaining };
}

export function summarizeWarrantyItem(item: WarrantyItemLike, today: string) {
  const summary: Record<WarrantyCoverageStatus, number> = {
    unknown: 0,
    upcoming: 0,
    active: 0,
    expiring: 0,
    expired: 0,
  };
  const coverages =
    item.payload.coverages?.filter((coverage) => !coverage.archived) ?? [];

  if (coverages.length === 0) summary.unknown = 1;
  for (const coverage of coverages)
    summary[getCoverageStatus(coverage, today).status] += 1;

  return summary;
}

export interface WarrantySummary {
  tracked_items: number;
  expiring_items: number;
  next_expiry: {
    item_id: string;
    item_name: string;
    coverage_id: string;
    coverage_label: string;
    end_date: string;
    days_remaining: number;
  } | null;
}

export function buildWarrantySummary(
  items: WarrantyItemLike[],
  today: string,
): WarrantySummary {
  const eligibleItems = items.filter(
    (item) =>
      !item.payload.archived &&
      (item.payload.ownership_status ?? "owned") === "owned",
  );
  const expiryCandidates: NonNullable<WarrantySummary["next_expiry"]>[] = [];
  let expiring_items = 0;

  for (const item of eligibleItems) {
    let itemIsExpiring = false;
    for (const coverage of item.payload.coverages ?? []) {
      if (coverage.archived || !coverage.id || !coverage.end_date) continue;
      const status = getCoverageStatus(coverage, today);
      if (status.status === "expiring") itemIsExpiring = true;
      if (status.status === "active" || status.status === "expiring") {
        expiryCandidates.push({
          item_id: item._id,
          item_name: item.payload.name,
          coverage_id: coverage.id,
          coverage_label: coverage.label,
          end_date: coverage.end_date,
          days_remaining: status.daysRemaining ?? 0,
        });
      }
    }
    if (itemIsExpiring) expiring_items += 1;
  }

  expiryCandidates.sort(
    (left, right) =>
      left.end_date.localeCompare(right.end_date) ||
      left.item_name.localeCompare(right.item_name) ||
      left.item_id.localeCompare(right.item_id) ||
      left.coverage_id.localeCompare(right.coverage_id),
  );

  return {
    tracked_items: eligibleItems.length,
    expiring_items,
    next_expiry: expiryCandidates[0] ?? null,
  };
}
