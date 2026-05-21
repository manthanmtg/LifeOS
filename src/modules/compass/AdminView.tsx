"use client";

import { useMemo, useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle, Filter } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CompassTask } from "./types";
import WorkspaceModal from "./WorkspaceModal";
import CompassMetrics from "./CompassMetrics";
import CompassTaskCard from "./CompassTaskCard";
import { SkeletonBlock } from "@/components/ui/Skeletons";

const COLUMNS = [
  { id: "backlog", title: "Backlog", dotColor: "bg-zinc-500" },
  { id: "in_progress", title: "In Progress", dotColor: "bg-accent" },
  { id: "review", title: "Review", dotColor: "bg-warning" },
  { id: "done", title: "Done", dotColor: "bg-success" },
] as const;

const PRIORITY_FILTERS = [
  { value: null, label: "All" },
  { value: "p1", label: "P1" },
  { value: "p2", label: "P2" },
  { value: "p3", label: "P3" },
  { value: "p4", label: "P4" },
  { value: "p5", label: "P5" },
] as const;

function KanbanSkeleton() {
  return (
    <div className="flex h-full gap-6 min-w-max animate-pulse">
      {COLUMNS.map((col) => (
        <div key={col.id} className="w-80 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <SkeletonBlock className="h-4 w-24 rounded" />
            <SkeletonBlock className="h-4 w-6 rounded-full" />
          </div>
          {[
            ...Array(
              col.id === "backlog" ? 3 : col.id === "in_progress" ? 2 : 1,
            ),
          ].map((_, i) => (
            <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CompassAdminView() {
  const [tasks, setTasks] = useState<CompassTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  // Modal state
  const [selectedTask, setSelectedTask] = useState<CompassTask | null>(null);

  // View state
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/content?module_type=compass_task");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch tasks");
      setTasks(data.data || []);
    } catch (err: unknown) {
      console.error("fetchTasks failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = (updatedTask: CompassTask) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)),
    );
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickAddTitle.trim();
    if (!title) return;

    setIsSaving(true);
    const payload = {
      title,
      status: focusMode ? "in_progress" : "backlog",
      comments: [],
      checklist: [],
      category_tags: [],
      priority: "p3",
      links: [],
    };

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "compass_task",
          is_public: false,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add task");
      if (data.success) {
        await fetchTasks();
      }
      setQuickAddTitle("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add task";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDraggedOverCol(colId);
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDraggedOverCol(null);

    if (!draggedTaskId) return;

    const taskIndex = tasks.findIndex((t) => t._id === draggedTaskId);
    if (taskIndex === -1) return;

    const task = tasks[taskIndex];
    if (task.payload.status === colId) return;

    const updatedTask = {
      ...task,
      payload: {
        ...task.payload,
        status: colId as CompassTask["payload"]["status"],
      },
    };

    const newTasks = [...tasks];
    newTasks[taskIndex] = updatedTask;
    setTasks(newTasks);
    setIsUpdatingId(draggedTaskId);

    try {
      const res = await fetch(`/api/content/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: updatedTask.payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
    } catch (err: unknown) {
      console.error("Failed to update status", err);
      fetchTasks();
    } finally {
      setIsUpdatingId(null);
    }

    setDraggedTaskId(null);
  };

  const handleDeleteDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverCol(null);
    if (!draggedTaskId) return;

    const taskIdToDelete = draggedTaskId;
    setDraggedTaskId(null);
    setIsDeletingId(taskIdToDelete);

    setTasks((prev) => prev.filter((t) => t._id !== taskIdToDelete));

    try {
      const res = await fetch(`/api/content/${taskIdToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete task");
    } catch (err: unknown) {
      console.error("Failed to delete task", err);
      fetchTasks();
    } finally {
      setIsDeletingId(null);
    }
  };

  const tasksByStatus = useMemo(() => {
    const buckets = {
      backlog: [] as CompassTask[],
      in_progress: [] as CompassTask[],
      review: [] as CompassTask[],
      done: [] as CompassTask[],
    };

    for (const task of tasks) {
      if (!filterPriority || task.payload.priority === filterPriority) {
        buckets[task.payload.status].push(task);
      }
    }

    for (const status of Object.keys(buckets) as Array<
      keyof typeof buckets
    >) {
      buckets[status] = buckets[status].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
    }

    return buckets;
  }, [tasks, filterPriority]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-fade-in-up">
      {/* Metrics */}
      {!loading && <CompassMetrics tasks={tasks} />}

      {/* Header: Quick Add + Controls */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
        <div className="flex-1">
          <form onSubmit={handleQuickAdd} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Plus className="w-5 h-5 text-zinc-500 group-focus-within:text-accent transition-colors" />
            </div>
            <input
              type="text"
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Type an idea and press Enter..."
              aria-label="Quick add task"
              maxLength={200}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-zinc-50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-sm disabled:opacity-50"
              disabled={isSaving}
            />
          </form>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle priority filters"
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors border",
            showFilters || filterPriority
              ? "bg-accent/20 border-accent/40 text-accent"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
          )}
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>

        <button
          onClick={() => setFocusMode(!focusMode)}
          aria-label={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors border",
            focusMode
              ? "bg-accent/20 border-accent/40 text-accent"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
          )}
        >
          <CheckCircle className="w-4 h-4" />
          {focusMode ? "Exit Focus" : "Focus Mode"}
        </button>
      </div>

      {/* Priority Filter Pills */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 shrink-0 overflow-hidden"
          >
            <span className="text-xs text-zinc-500 font-medium">Priority:</span>
            {PRIORITY_FILTERS.map((pf) => (
              <button
                key={String(pf.value)}
                onClick={() => setFilterPriority(pf.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-colors border",
                  filterPriority === pf.value
                    ? "bg-accent/20 border-accent/40 text-accent"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
                )}
              >
                {pf.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {loading ? (
          <KanbanSkeleton />
        ) : (
          <div className="flex h-full gap-6 min-w-max">
            {COLUMNS.filter(
              (col) => !focusMode || col.id === "in_progress",
            ).map((col) => {
              const colTasks = tasksByStatus[col.id];
              const isOver = draggedOverCol === col.id;

              return (
                <div
                  key={col.id}
                  className="w-80 h-full flex flex-col"
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragLeave={() => setDraggedOverCol(null)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <span
                        className={cn("w-2 h-2 rounded-full", col.dotColor)}
                      />
                      {col.title}
                    </h3>
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task List Container */}
                  <div
                    className={cn(
                      "flex-1 overflow-y-auto rounded-2xl p-2 transition-colors duration-200 border-2",
                      isOver
                        ? "bg-zinc-900 border-zinc-700 border-dashed"
                        : "bg-transparent border-transparent",
                    )}
                  >
                    <div className="space-y-3">
                      <AnimatePresence>
                        {colTasks.map((task) => (
                          <motion.div
                            key={task._id}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                          >
                            <CompassTaskCard
                              task={task}
                              isDragging={draggedTaskId === task._id}
                              isUpdating={isUpdatingId === task._id}
                              isDeleting={isDeletingId === task._id}
                              isInProgress={col.id === "in_progress"}
                              onClick={() => setSelectedTask(task)}
                              onDragStart={(e) => handleDragStart(e, task._id)}
                              onDragEnd={handleDragEnd}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {colTasks.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-sm text-zinc-500 font-medium opacity-50">
                          Drop here
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drop to Delete Zone */}
      {draggedTaskId && (
        <div
          className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all duration-300 z-40 bg-zinc-950/90 backdrop-blur-md shadow-2xl",
            draggedOverCol === "delete"
              ? "border-danger scale-110 text-danger"
              : "border-danger/30 text-danger/70",
          )}
          onDragOver={(e) => handleDragOver(e, "delete")}
          onDragLeave={() => setDraggedOverCol(null)}
          onDrop={handleDeleteDrop}
        >
          <Trash2
            className={cn(
              "w-6 h-6",
              draggedOverCol === "delete" && "animate-bounce",
            )}
          />
          <span className="font-semibold tracking-wide">Drop to Delete</span>
        </div>
      )}

      {selectedTask && (
        <WorkspaceModal
          task={selectedTask}
          onClose={handleCloseModal}
          onUpdate={handleUpdateTask}
        />
      )}
    </div>
  );
}
