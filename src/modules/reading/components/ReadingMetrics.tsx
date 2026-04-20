"use client";

import React, { useMemo } from "react";
import { ReadingItem } from "../types";
import { motion } from "framer-motion";

interface ReadingMetricsProps {
  items: ReadingItem[];
}

export function ReadingMetrics({ items }: ReadingMetricsProps) {
  const stats = useMemo(() => {
    const total = items.length;
    const unread = items.filter((item) => !item.payload.is_read).length;
    const highPriorityUnread = items.filter(
      (item) => !item.payload.is_read && item.payload.priority === "high",
    ).length;
    const read = items.filter((item) => item.payload.is_read).length;
    const readRate = total > 0 ? (read / total) * 100 : 0;

    return [
      { label: "Total", value: total, color: "text-zinc-50" },
      { label: "Unread", value: unread, color: "text-zinc-50" },
      {
        label: "High Priority",
        value: highPriorityUnread,
        color: "text-danger",
      },
      { label: "Completed", value: read, color: "text-success" },
      { label: "Read Rate", value: `${readRate.toFixed(0)}%`, color: "text-zinc-50" },
    ];
  }, [items]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"
        >
          <p className="text-xs text-zinc-500">{stat.label}</p>
          <p className={`text-lg font-semibold ${stat.color}`}>
            {stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
