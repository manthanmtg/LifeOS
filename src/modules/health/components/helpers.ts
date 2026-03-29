// Shared helper functions for health module components

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
