"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil } from "./helpers";

interface Alert {
  profileName: string;
  label: string;
  date: string;
  status: "overdue" | "warning";
}

interface AlertsBannerProps {
  alerts: Alert[];
}

export default function AlertsBanner({ alerts }: AlertsBannerProps) {
  if (alerts.length === 0) return null;

  const displayAlerts = alerts.slice(0, 5);
  const hasMore = alerts.length > 5;

  return (
    <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-warning/15 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
        </div>
        <p className="text-xs font-bold text-warning uppercase tracking-widest">
          {alerts.length} Alert{alerts.length !== 1 ? "s" : ""} Need Attention
        </p>
      </div>
      <div className="space-y-2">
        {displayAlerts.map((a, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs py-1 border-b border-warning/10 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  a.status === "overdue" ? "bg-danger" : "bg-warning",
                )}
              />
              <span className="text-zinc-300 truncate">
                <span className="font-semibold">{a.profileName}</span> —{" "}
                {a.label}
              </span>
            </div>
            <span
              className={cn(
                "font-bold shrink-0 ml-3",
                a.status === "overdue" ? "text-danger" : "text-warning",
              )}
            >
              {a.status === "overdue"
                ? `Overdue ${Math.abs(daysUntil(a.date) ?? 0)}d`
                : `${daysUntil(a.date) ?? 0}d left`}
            </span>
          </div>
        ))}
      </div>
      {hasMore && (
        <p className="text-[10px] text-warning/60 font-medium uppercase tracking-wider mt-2 text-right">
          +{alerts.length - 5} more alerts
        </p>
      )}
    </div>
  );
}
