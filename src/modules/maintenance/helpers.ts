import type { Status, MaintenancePayload } from "./types";

export function formatFrequency(months?: number): string {
  if (!months) return "One-time";
  if (months === 1) return "Every month";
  if (months === 2) return "Every 2 months";
  if (months === 3) return "Every quarter";
  if (months === 6) return "Every 6 months";
  if (months === 12) return "Every year";
  if (months === 24) return "Every 2 years";
  return `Every ${months} months`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function computeStatus(task: MaintenancePayload, now: Date): Status {
  if (task.status === "completed" || task.status === "skipped")
    return task.status;
  if (!task.next_due) return "upcoming";
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.next_due);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  return "upcoming";
}

export function daysUntilDue(next_due: string | undefined, now: Date): number | null {
  if (!next_due) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(next_due);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function dueProgressPercent(
  last_completed: string | undefined,
  next_due: string | undefined,
  now: Date,
): number {
  if (!last_completed || !next_due) return 0;
  const start = new Date(last_completed).getTime();
  const end = new Date(next_due).getTime();
  const current = now.getTime();
  if (end <= start) return 100;
  const pct = ((current - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
