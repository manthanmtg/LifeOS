"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompassTask } from "./types";

const PRIORITY_MAP = {
  p1: { label: "P1: Urgent", color: "text-danger bg-danger/10 border-danger/20" },
  p2: { label: "P2: High", color: "text-warning bg-warning/10 border-warning/20" },
  p3: { label: "P3: Normal", color: "text-accent bg-accent/10 border-accent/20" },
  p4: { label: "P4: Low", color: "text-zinc-400 bg-zinc-400/10 border-zinc-700/50" },
  p5: { label: "P5: Backburner", color: "text-zinc-500 bg-zinc-800/50 border-zinc-700/30" },
};

interface CompassTaskCardProps {
  task: CompassTask;
  isDragging: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isInProgress: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export default function CompassTaskCard({
  task,
  isDragging,
  isUpdating,
  isDeleting,
  isInProgress,
  onClick,
  onDragStart,
  onDragEnd,
}: CompassTaskCardProps) {
  const ageDays = useMemo(() => {
    return (
      (new Date().getTime() -
        new Date(task.updated_at || task.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
    );
  }, [task.updated_at, task.created_at]);

  const isStuck = isInProgress && ageDays > 7;
  const priority = PRIORITY_MAP[task.payload.priority];
  const checklistDone =
    task.payload.checklist?.filter((c) => c.completed).length ?? 0;
  const checklistTotal = task.payload.checklist?.length ?? 0;

  return (
    <motion.div
      draggable
      onDragStartCapture={onDragStart}
      onDragEndCapture={onDragEnd}
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 p-4 rounded-xl cursor-pointer hover:border-zinc-600 transition-colors shadow-sm hover:shadow-xl hover:shadow-accent/5 group relative overflow-hidden",
        isDragging && "opacity-50 scale-95",
        isStuck && "border-warning/30 bg-warning/5",
      )}
    >
      <div className="flex gap-2 items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-zinc-300 leading-snug group-hover:text-white transition-colors">
          {task.payload.title}
        </h4>
        {(isUpdating || isDeleting) && (
          <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center text-zinc-500 mt-3">
        <span
          className={cn(
            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
            priority.color,
          )}
        >
          {priority.label}
        </span>
        {task.payload.category_tags?.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 px-1.5 py-0.5 rounded transition-colors group-hover:border-zinc-600"
          >
            {tag}
          </span>
        ))}

        <div className="ml-auto flex items-center gap-3">
          {checklistTotal > 0 && (
            <span className="text-xs flex items-center gap-1 group-hover:text-zinc-300 transition-colors">
              <CheckCircle className="w-3 h-3 text-accent" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {isStuck && (
            <span
              className="text-xs text-warning/80 flex items-center gap-1"
              title="Stuck > 7 days"
            >
              <Clock className="w-3 h-3" /> {Math.floor(ageDays)}d
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
