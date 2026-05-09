import {
  Home,
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
  Cog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Category, Priority, Status, MaintenancePayload } from "./types";

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
  home: "bg-accent/15 text-accent border-accent/20",
  appliance: "bg-warning/15 text-warning border-warning/20",
  vehicle: "bg-accent/15 text-accent border-accent/20",
  electronics: "bg-accent/15 text-accent border-accent/20",
  plumbing: "bg-accent/15 text-accent border-accent/20",
  electrical: "bg-warning/15 text-warning border-warning/20",
  hvac: "bg-success/15 text-success border-success/20",
  garden: "bg-success/15 text-success border-success/20",
  cleaning: "bg-danger/15 text-danger border-danger/20",
  insurance: "bg-accent/15 text-accent border-accent/20",
  subscription: "bg-accent/15 text-accent border-accent/20",
  other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export const STATUS_STYLES: Record<Status, string> = {
  overdue: "bg-danger/15 text-danger border-danger/20",
  upcoming: "bg-success/15 text-success border-success/20",
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
