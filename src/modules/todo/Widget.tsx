"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckSquare, ListTodo } from "lucide-react";
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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=todo", { signal: ac.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Summary request failed: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        setSummary(data.data ?? null);
        setHasError(false);
      })
      .catch((error: unknown) => {
        if (
          ac.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setHasError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
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
        {hasError ? (
          <>
            <WidgetStat value="—" label="task summary unavailable" />
            <WidgetHighlight
              icon={AlertTriangle}
              text="Unable to load task summary"
              subtext="Open Tasks to retry"
              variant="warning"
            />
          </>
        ) : summary ? (
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
