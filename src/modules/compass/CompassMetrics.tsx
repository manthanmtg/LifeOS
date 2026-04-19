"use client";

import { useMemo } from "react";
import { GitPullRequest, Layers, Target, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { CompassTask } from "./types";

interface CompassMetricsProps {
  tasks: CompassTask[];
}

export default function CompassMetrics({ tasks }: CompassMetricsProps) {
  const stats = useMemo(() => {
    const now = new Date().getTime();
    const total = tasks.length;
    const backlog = tasks.filter((t) => t.payload.status === "backlog").length;
    const inProgress = tasks.filter(
      (t) => t.payload.status === "in_progress",
    ).length;
    const review = tasks.filter((t) => t.payload.status === "review").length;
    const done = tasks.filter((t) => t.payload.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const p1Count = tasks.filter((t) => t.payload.priority === "p1").length;
    const stuck = tasks.filter((t) => {
      if (t.payload.status !== "in_progress") return false;
      const ageDays =
        (now - new Date(t.updated_at || t.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return ageDays > 7;
    }).length;

    return {
      total,
      backlog,
      inProgress,
      review,
      done,
      completionRate,
      p1Count,
      stuck,
    };
  }, [tasks]);

  const attentionCount = stats.p1Count + stats.stuck;

  const cards = [
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: GitPullRequest,
      color: "text-accent",
      bgColor: "bg-accent/10",
      description: `${stats.backlog} in backlog`,
    },
    {
      label: "Review",
      value: stats.review,
      icon: Layers,
      color: "text-warning",
      bgColor: "bg-warning/10",
      description: "awaiting review",
    },
    {
      label: "Completion",
      value: `${stats.completionRate}%`,
      icon: Target,
      color: "text-success",
      bgColor: "bg-success/10",
      description: `${stats.done} of ${stats.total} done`,
    },
    {
      label: "Attention",
      value: attentionCount,
      icon: AlertTriangle,
      color: attentionCount > 0 ? "text-danger" : "text-zinc-500",
      bgColor: attentionCount > 0 ? "bg-danger/10" : "bg-zinc-500/10",
      description: `${stats.p1Count} critical · ${stats.stuck} stuck`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="relative group bg-zinc-900/40 backdrop-blur-md border border-zinc-800/40 p-4 rounded-2xl overflow-hidden hover:border-zinc-700/60 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-1">
                {card.label}
              </span>
              <span
                className={`text-2xl font-black tracking-tight ${card.color}`}
              >
                {card.value}
              </span>
              <span className="text-[10px] font-medium text-zinc-600 mt-1.5 block">
                {card.description}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`absolute -right-4 -bottom-4 w-20 h-20 ${card.bgColor} blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}
          />
        </motion.div>
      ))}
    </div>
  );
}
