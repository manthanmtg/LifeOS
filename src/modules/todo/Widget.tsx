"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
  WidgetList,
} from "@/components/dashboard/widget-primitives";

interface TodoSummary {
  activeCount: number;
  doneCount: number;
  topActive: Array<{ _id: string; title: string }>;
}

export default function TodoWidget() {
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/widgets/summary?module_type=todo")
      .then((r) => r.json())
      .then((d) => setSummary(d.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard
      title="Tasks"
      icon={CheckSquare}
      loading={loading}
      href="/admin/todo"
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="space-y-3"
      >
        {summary ? (
          <>
            <WidgetStat
              value={summary.activeCount}
              label={summary.activeCount === 0 ? "all clear" : "pending"}
            />
            {summary.topActive.length > 0 ? (
              <WidgetList
                items={summary.topActive.map((t) => ({
                  label: t.title,
                  icon: ListTodo,
                }))}
              />
            ) : (
              <WidgetHighlight
                icon={CheckSquare}
                text="No pending tasks"
                variant="success"
              />
            )}
          </>
        ) : (
          <>
            <WidgetStat value={0} label="tasks" />
            <WidgetHighlight
              icon={CheckSquare}
              text="No tasks available"
              subtext="Create a task to get started"
              variant="default"
            />
          </>
        )}
      </motion.div>
    </WidgetCard>
  );
}
