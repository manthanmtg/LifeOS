"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDueStatus, daysUntil } from "./helpers";

export function dueBadge(dateStr?: string, label?: string) {
  const status = getDueStatus(dateStr);
  if (status === "none") return null;
  const days = daysUntil(dateStr)!;
  const config = {
    overdue: {
      text: `${label ? label + ": " : ""}Overdue ${Math.abs(days)}d`,
      bg: "bg-danger/10",
      border: "border-danger/20",
      color: "text-danger",
      ring: "ring-danger/25",
    },
    warning: {
      text: `${label ? label + ": " : ""}${days}d left`,
      bg: "bg-warning/10",
      border: "border-warning/20",
      color: "text-warning",
      ring: "ring-warning/25",
    },
    ok: {
      text: `${label ? label + ": " : ""}${days}d left`,
      bg: "bg-success/10",
      border: "border-success/20",
      color: "text-success",
      ring: "ring-success/25",
    },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border shadow-sm ring-1",
        config.bg,
        config.border,
        config.color,
        config.ring,
      )}
    >
      {status === "overdue" ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      {config.text}
    </span>
  );
}
