// Shared helper functions for health module components

import type { Vaccination } from "./types";

export const VACCINE_REPEAT_INTERVAL_MONTHS = [1, 3, 6, 12] as const;

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function calculateNextDueDate(
  date: string,
  intervalMonths?: Vaccination["repeat_interval_months"],
): string | undefined {
  if (!intervalMonths || !date) return undefined;
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const targetMonth = month - 1 + intervalMonths;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const targetDay = Math.min(day, daysInMonth(targetYear, normalizedMonth));
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

export function createVaccinationRepeatDraft(vaccination: Vaccination) {
  return {
    name: vaccination.name,
    provider: vaccination.provider || "",
    notes: vaccination.notes || "",
    dose_label: vaccination.dose_label || "",
    repeat_interval_months: vaccination.repeat_interval_months,
    reminder_enabled:
      vaccination.reminder_enabled ?? Boolean(vaccination.next_due),
    reminder_offsets_days: vaccination.reminder_offsets_days || [30, 7, 1],
    batch_number: "",
    attachments: [],
  } satisfies Partial<Vaccination>;
}

export function formatDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateInput(d?: string): string {
  if (!d) return "";
  return d.slice(0, 10);
}

export function getTodayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toISODate(d: string): string {
  if (!d) return "";
  if (d.includes("T")) return d;
  return `${d}T00:00:00.000Z`;
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDueStatus(
  dateStr?: string,
): "overdue" | "warning" | "ok" | "none" {
  if (!dateStr) return "none";
  const days = daysUntil(dateStr);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days <= 30) return "warning";
  return "ok";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateBMI(
  heightCm?: number,
  weightKg?: number,
): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "text-warning" };
  if (bmi < 25) return { label: "Normal", color: "text-success" };
  if (bmi < 30) return { label: "Overweight", color: "text-warning" };
  return { label: "Obese", color: "text-danger" };
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function emptyPayload() {
  return {
    name: "",
    type: "self" as const,
    blood_group: "unknown" as const,
    allergies: [] as string[],
    conditions: [],
    medications: [],
    vaccinations: [],
    visits: [],
    lab_results: [],
    measurements: [],
    documents: [],
    tags: [] as string[],
  };
}
