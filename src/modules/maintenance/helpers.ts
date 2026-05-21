import type { Status, MaintenancePayload } from "./types";

function parsedTime(iso?: string): number | null {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
}

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
  const value = parsedTime(iso);
  if (value === null) return "--";
  const d = new Date(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function computeStatus(task: MaintenancePayload, now: Date): Status {
  if (task.status === "completed" || task.status === "skipped")
    return task.status;
  const dueTime = parsedTime(task.next_due);
  if (dueTime === null) return "upcoming";
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueTime);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  return "upcoming";
}

export function daysUntilDue(next_due: string | undefined, now: Date): number | null {
  const dueTime = parsedTime(next_due);
  if (dueTime === null) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueTime);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function dueProgressPercent(
  last_completed: string | undefined,
  next_due: string | undefined,
  now: Date,
): number {
  const start = parsedTime(last_completed);
  const end = parsedTime(next_due);
  if (start === null || end === null) return 0;
  const current = now.getTime();
  if (end <= start) return 100;
  const pct = ((current - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function addMonths(dateStr: string, months: number): string {
  const start = parsedTime(dateStr);
  if (start === null) return "";
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
