"use client";

import { useMemo } from "react";
import { Activity, Heart, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
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

    // Health Score: % of non-stale people
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
      bgColor: "bg-accent/10",
      description: "Talked to recently",
    },
    {
      label: "Inner Circle",
      value: stats.favorites,
      icon: Heart,
      color: "text-accent",
      bgColor: "bg-accent/10",
      description: "Close to your heart",
    },
    {
      label: "Catch Up",
      value: stats.stale,
      icon: AlertCircle,
      color: stats.stale > 0 ? "text-warning" : "text-zinc-500",
      bgColor: stats.stale > 0 ? "bg-warning/10" : "bg-zinc-500/10",
      description: "Haven\u2019t heard from in a while",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative group bg-zinc-900/40 backdrop-blur-md border border-zinc-800/40 p-5 rounded-[2rem] overflow-hidden hover:border-accent/20 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
                {card.label}
              </span>
              <span
                className={`text-3xl font-black italic tracking-tighter ${card.color}`}
              >
                {card.value}
              </span>
              <span className="text-[10px] font-medium text-zinc-600 mt-2 block">
                {card.description}
              </span>
            </div>
            <div
              className={`p-3 rounded-2xl ${card.bgColor} ${card.color} shadow-inner transition-colors group-hover:bg-opacity-20`}
            >
              <card.icon className="w-5 h-5 shadow-sm" />
            </div>
          </div>
          <div
            className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.bgColor} blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}
          />
        </motion.div>
      ))}
    </div>
  );
}
