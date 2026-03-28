import type { LucideIcon } from "lucide-react";
import {
  Home,
  Cog,
  Car,
  Cpu,
  Droplets,
  Zap,
  Wind,
  Leaf,
  Sparkles,
  Shield,
  CreditCard,
  HelpCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "home",
  "appliance",
  "vehicle",
  "electronics",
  "plumbing",
  "electrical",
  "hvac",
  "garden",
  "cleaning",
  "insurance",
  "subscription",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Status = "upcoming" | "overdue" | "completed" | "skipped";
export type ServiceType = "self" | "managed";

export interface HistoryEntry {
  id: string;
  completed_at: string;
  cost?: number;
  notes?: string;
  vendor?: string;
}

export interface MaintenancePayload {
  name: string;
  description?: string;
  category: Category;
  service_type: ServiceType;
  frequency_months?: number;
  last_completed?: string;
  next_due?: string;
  estimated_cost?: number;
  currency: string;
  priority: Priority;
  status: Status;
  is_recurring: boolean;
  reminder_enabled: boolean;
  history: HistoryEntry[];
  tags: string[];
  notes?: string;
}

export interface MaintenanceTask {
  _id: string;
  payload: MaintenancePayload;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceStats {
  total: number;
  overdue: number;
  dueSoon: number;
  completedThisMonth: number;
  totalCostThisYear: number;
  avgCostPerCompletion: number;
  categoryBreakdown: Record<string, number>;
  monthlyCompletions: number[];
  monthlyCosts: number[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  home: Home,
  appliance: Cog,
  vehicle: Car,
  electronics: Cpu,
  plumbing: Droplets,
  electrical: Zap,
  hvac: Wind,
  garden: Leaf,
  cleaning: Sparkles,
  insurance: Shield,
  subscription: CreditCard,
  other: HelpCircle,
};

export const CATEGORY_COLORS: Record<Category, string> = {
  home: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  appliance: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  vehicle: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  electronics: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  plumbing: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  electrical: "bg-warning/15 text-warning border-warning/20",
  hvac: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  garden: "bg-success/15 text-success border-success/20",
  cleaning: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  insurance: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  subscription: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export const STATUS_STYLES: Record<Status, string> = {
  overdue: "bg-danger/15 text-danger border-danger/20",
  upcoming: "bg-accent/15 text-accent border-accent/20",
  completed: "bg-success/15 text-success border-success/20",
  skipped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-success",
};

export const CURR_SYM: Record<string, string> = {
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  INR: "\u20b9",
  JPY: "\u00a5",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "\u00a5",
  BRL: "R$",
};

export const EMPTY_FORM: MaintenancePayload = {
  name: "",
  description: "",
  category: "home",
  service_type: "self",
  frequency_months: undefined,
  last_completed: undefined,
  next_due: undefined,
  estimated_cost: undefined,
  currency: "INR",
  priority: "medium",
  status: "upcoming",
  is_recurring: true,
  reminder_enabled: true,
  history: [],
  tags: [],
  notes: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

export function computeStatus(task: MaintenancePayload): Status {
  if (task.status === "completed" || task.status === "skipped")
    return task.status;
  if (!task.next_due) return "upcoming";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(task.next_due);
  due.setHours(0, 0, 0, 0);
  if (due < now) return "overdue";
  return "upcoming";
}

export function daysUntilDue(next_due?: string): number | null {
  if (!next_due) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(next_due);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function dueProgressPercent(
  last_completed?: string,
  next_due?: string,
): number {
  if (!last_completed || !next_due) return 0;
  const start = new Date(last_completed).getTime();
  const end = new Date(next_due).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  const pct = ((now - start) / (end - start)) * 100;
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
