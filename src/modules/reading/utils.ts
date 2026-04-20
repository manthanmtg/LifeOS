import { Priority } from "./types";
import { ArrowUpCircle, ArrowRightCircle, ArrowDownCircle } from "lucide-react";

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function formatDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString();
}

export const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-danger/15 text-danger border-danger/25",
  medium: "bg-warning/15 text-warning border-warning/25",
  low: "bg-success/15 text-success border-success/25",
};

export const PRIORITY_ICONS: Record<
  Priority,
  React.ComponentType<{ className?: string }>
> = {
  high: ArrowUpCircle,
  medium: ArrowRightCircle,
  low: ArrowDownCircle,
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
