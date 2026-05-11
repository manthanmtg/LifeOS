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
type ServiceType = "self" | "managed";

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
