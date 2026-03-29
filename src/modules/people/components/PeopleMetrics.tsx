"use client";

import { useMemo } from "react";
import { Activity, Heart, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Person } from "../types";

interface PeopleMetricsProps {
  people: Person[];
}

export default function PeopleMetrics({ people }: PeopleMetricsProps) {
  const stats = useMemo(() => {
    const total = people.length;
    const favorites = people.filter((p) => p.payload.is_favorite).length;

    const now = new Date();
    const stale = people.filter((p) => {
      if (!p.payload.last_contacted) return true;
      const last = new Date(p.payload.last_contacted);
      const diffDays = Math.floor(
        (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays > 90;
    }).length;

    const healthScore =
      total === 0 ? 0 : Math.round(((total - stale) / total) * 100);

    return { total, favorites, stale, healthScore };
  }, [people]);

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
      value: stats.stale,
      icon: AlertCircle,
      color: stats.stale > 0 ? "text-warning" : "text-zinc-500",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl"
        >
          <card.icon className={cn("w-4 h-4 shrink-0", card.color)} />
          <div className="min-w-0">
            <p className={cn("text-lg font-bold tabular-nums", card.color)}>
              {card.value}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium truncate">
              {card.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
