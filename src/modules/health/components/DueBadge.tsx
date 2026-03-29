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
    },
    warning: {
      text: `${label ? label + ": " : ""}${days}d left`,
      bg: "bg-warning/10",
      border: "border-warning/20",
      color: "text-warning",
    },
    ok: {
      text: `${label ? label + ": " : ""}${days}d left`,
      bg: "bg-success/10",
      border: "border-success/20",
      color: "text-success",
    },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
        config.bg,
        config.border,
        config.color,
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
