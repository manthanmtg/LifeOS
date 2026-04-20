"use client";

import { useMemo } from "react";
import { Activity, Heart, AlertCircle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Person } from "../types";
import { getPeopleSummary } from "../insights";

interface PeopleMetricsProps {
  people: Person[];
}

export default function PeopleMetrics({ people }: PeopleMetricsProps) {
  const stats = useMemo(() => getPeopleSummary(people), [people]);

  const cards = [
    {
      label: "In Touch",
      value: `${stats.healthScore}%`,
      icon: Activity,
      color: "text-accent",
    },
    {
      label: "Inner Circle",
      value: stats.favorites,
      icon: Heart,
      color: "text-accent",
    },
    {
      label: "Catch Up",
      value: stats.staleCount,
      icon: AlertCircle,
      color: stats.staleCount > 0 ? "text-warning" : "text-zinc-500",
    },
    {
      label: "Birthdays Soon",
      value: stats.upcomingBirthdaysCount,
      icon: CalendarClock,
      color: stats.upcomingBirthdaysCount > 0 ? "text-accent" : "text-zinc-500",
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3"
        >
          <card.icon className={cn("w-4 h-4 shrink-0", card.color)} />
          <div className="min-w-0">
            <p className={cn("text-lg font-bold tabular-nums", card.color)}>
              {card.value}
            </p>
            <p className="truncate text-[10px] font-medium text-zinc-500">
              {card.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
