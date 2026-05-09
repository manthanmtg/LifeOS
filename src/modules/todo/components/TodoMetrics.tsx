"use client";

import { useMemo } from "react";
import { Target, Zap, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { TodoDocument } from "../types";

interface TodoMetricsProps {
  todos: TodoDocument[];
  currentDate: Date;
}

export default function TodoMetrics({ todos, currentDate }: TodoMetricsProps) {
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.payload.completed).length;
    const focusScore = total === 0 ? 0 : Math.round((completed / total) * 100);

    const todayStr = currentDate.toDateString();
    const overdue = todos.filter((t) => {
      if (t.payload.completed || !t.payload.due_date) return false;
      return (
        new Date(t.payload.due_date) < currentDate &&
        new Date(t.payload.due_date).toDateString() !== todayStr
      );
    }).length;

    // Velocity: completed in last 7 days
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const velocity = todos.filter((t) => {
      if (!t.payload.completed || !t.payload.completed_at) return false;
      return new Date(t.payload.completed_at) > sevenDaysAgo;
    }).length;

    return { focusScore, overdue, velocity };
  }, [todos, currentDate]);

  const cards = [
    {
      label: "Focus Score",
      value: `${stats.focusScore}%`,
      icon: Target,
      color: "text-accent",
      bgColor: "bg-accent/10",
      description: "Lifetime completion rate",
    },
    {
      label: "Velocity",
      value: stats.velocity,
      icon: Zap,
      color: "text-success",
      bgColor: "bg-success/10",
      description: "Tasks completed this week",
    },
    {
      label: "Pressure",
      value: stats.overdue,
      icon: AlertCircle,
      color: stats.overdue > 0 ? "text-danger" : "text-zinc-500",
      bgColor: stats.overdue > 0 ? "bg-danger/10" : "bg-zinc-500/10",
      description: "Overdue objectives",
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
              className={`p-3 rounded-2xl ${card.bgColor} ${card.color} shadow-inner`}
            >
              <card.icon className="w-5 h-5 shadow-sm" />
            </div>
          </div>

          {/* Subtle gradient accent */}
          <div
            className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.bgColor} blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}
          />
        </motion.div>
      ))}
    </div>
  );
}
