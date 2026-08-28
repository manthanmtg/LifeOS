"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TodoDocument, TodoPayload, TodoPriority } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

// Components
import TodoModal from "./TodoModal";
import TodoCard from "./components/TodoCard";
import TodoFilters, { TodoFilterType } from "./components/TodoFilters";
import TodoHeader from "./components/TodoHeader";
import TodoMetrics from "./components/TodoMetrics";
import QuickAddTodo from "./components/QuickAddTodo";

import TodoToolbar, { TodoSortType } from "./components/TodoToolbar";
import TodoEmptyState from "./components/TodoEmptyState";
import TodoLoading from "./components/TodoLoading";

// UI Components
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const getDateTime = (value?: string | null): number | null => {
  if (!value) return null;

  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
};

export default function TodoAdminView() {
  const [todos, setTodos] = useState<TodoDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TodoFilterType>("todo");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TodoSortType>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoDocument | undefined>(
    undefined,
  );

  // Undo & Delayed Delete state
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDeletedTodoRef = useRef<{
    todo: TodoDocument;
    index: number;
  } | null>(null);

  // Custom Dialog & Toast state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    isVisible: boolean;
    action?: { label: string; onClick: () => void };
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      action?: { label: string; onClick: () => void },
    ) => {
      setToast({ message, type, isVisible: true, action });
    },
    [],
  );

  const fetchTodos = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/content?module_type=todo");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch todos");
      setTodos(data.data || []);
    } catch (err: unknown) {
      console.error("fetchTodos failed:", err);
      setLoadError("Couldn't load your objectives. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTodos(true);
  }, [fetchTodos]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const handleSaveTodo = async (payload: TodoPayload) => {
    try {
      const isEdit = !!editingTodo;
      const url = isEdit ? `/api/content/${editingTodo._id}` : "/api/content";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { payload }
            : { module_type: "todo", is_public: false, payload },
        ),
      });

      if (!res.ok)
        throw new Error(`Failed to ${isEdit ? "update" : "create"} todo`);
      const data = await res.json();

      if (isEdit) {
        setTodos((prev) =>
          prev.map((t) => (t._id === editingTodo._id ? data.data : t)),
        );
        showToast("Objective Refined", "success");
      } else {
        setTodos((prev) => [data.data, ...prev]);
        showToast("New Objective Logged", "success");
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save todo",
        "error",
      );
    }
  };

  const handleQuickAdd = async (title: string, priority: TodoPriority) => {
    setIsSaving(true);
    try {
      const payload: TodoPayload = { title, priority, completed: false };
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "todo",
          is_public: false,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add todo");
      setTodos((prev) => [data.data, ...prev]);
      showToast("Task Captured", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add todo",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleComplete = async (todo: TodoDocument) => {
    const updatedPayload: TodoPayload = {
      ...todo.payload,
      completed: !todo.payload.completed,
      completed_at: !todo.payload.completed
        ? new Date().toISOString()
        : undefined,
    };

    setTodos((prev) =>
      prev.map((t) =>
        t._id === todo._id ? { ...t, payload: updatedPayload } : t,
      ),
    );

    try {
      const res = await fetch(`/api/content/${todo._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: updatedPayload }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      if (updatedPayload.completed) {
        showToast("Objective Conquered!", "success");
      }
    } catch {
      showToast("Friction detected in update", "error");
      fetchTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    const todoToDelete = todos.find((t) => t._id === id);
    if (!todoToDelete) return;
    const index = todos.findIndex((t) => t._id === id);

    setTodos((prev) => prev.filter((t) => t._id !== id));
    lastDeletedTodoRef.current = { todo: todoToDelete, index };
    setConfirmDeleteId(null);

    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    deleteTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/content/${id}`, { method: "DELETE" });
        lastDeletedTodoRef.current = null;
      } catch (err) {
        console.error("Delayed delete failed:", err);
      }
    }, 5000);

    showToast("Task archived", "success", {
      label: "Restore",
      onClick: () => {
        if (deleteTimeoutRef.current) {
          clearTimeout(deleteTimeoutRef.current);
          deleteTimeoutRef.current = null;
        }
        if (lastDeletedTodoRef.current) {
          setTodos((prev) => {
            const updated = [...prev];
            updated.splice(index, 0, lastDeletedTodoRef.current!.todo);
            return updated;
          });
          lastDeletedTodoRef.current = null;
          showToast("Objective Restored", "success");
        }
      },
    });
  };

  const clearCompleted = async () => {
    const completedTodos = todos.filter((t) => t.payload.completed);
    if (completedTodos.length === 0) return;
    try {
      await Promise.all(
        completedTodos.map((t) =>
          fetch(`/api/content/${t._id}`, { method: "DELETE" }),
        ),
      );
      setTodos((prev) => prev.filter((t) => !t.payload.completed));
      showToast("Cleared records", "success");
    } catch {
      showToast("Incomplete clearance", "error");
      fetchTodos();
    }
  };

  const filteredTodos = useMemo(() => {
    const todayStr = currentDate.toDateString();

    return todos
      .filter((t) => {
        if (!t.payload) return false;
        const matchesSearch = t.payload.title
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const isCompleted = t.payload.completed;
        const dueDate = t.payload.due_date
          ? new Date(t.payload.due_date)
          : null;
        const isToday = dueDate && dueDate.toDateString() === todayStr;
        const isOverdue =
          dueDate &&
          dueDate < currentDate &&
          dueDate.toDateString() !== todayStr &&
          !isCompleted;
        const isHigh = t.payload.priority === "high";

        switch (activeFilter) {
          case "done":
            return isCompleted;
          case "todo":
            return !isCompleted;
          case "today":
            return !isCompleted && isToday;
          case "overdue":
            return isOverdue;
          case "high":
            return !isCompleted && isHigh;
          default:
            return !isCompleted;
        }
      })
      .sort((a, b) => {
        if (activeFilter === "done") {
          return (
            new Date(b.payload?.completed_at || b.updated_at).getTime() -
            new Date(a.payload?.completed_at || a.updated_at).getTime()
          );
        }
        if (sortBy === "due_date") {
          const aDate = getDateTime(a.payload?.due_date);
          const bDate = getDateTime(b.payload?.due_date);
          if (aDate === null && bDate === null) return 0;
          if (aDate === null) return 1;
          if (bDate === null) return -1;
          return aDate - bDate;
        }
        if (sortBy === "priority") {
          return (
            PRIORITY_ORDER[a.payload?.priority || "medium"] -
            PRIORITY_ORDER[b.payload?.priority || "medium"]
          );
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [todos, searchQuery, activeFilter, sortBy, currentDate]);

  const counts = useMemo(() => {
    const todayStr = currentDate.toDateString();

    return {
      todo: todos.filter((t) => !t.payload?.completed).length,
      done: todos.filter((t) => t.payload?.completed).length,
      today: todos.filter((t) => {
        const dueDate = t.payload?.due_date
          ? new Date(t.payload.due_date)
          : null;
        return (
          !t.payload?.completed &&
          dueDate &&
          dueDate.toDateString() === todayStr
        );
      }).length,
      overdue: todos.filter((t) => {
        const dueDate = t.payload?.due_date
          ? new Date(t.payload.due_date)
          : null;
        return (
          !t.payload?.completed &&
          dueDate &&
          dueDate < currentDate &&
          dueDate.toDateString() !== todayStr
        );
      }).length,
      high: todos.filter(
        (t) => !t.payload?.completed && t.payload?.priority === "high",
      ).length,
    };
  }, [todos, currentDate]);

  return (
    <div className="flex flex-col min-h-dvh pb-20">
      <TodoHeader
        onAddTodo={() => {
          setEditingTodo(undefined);
          setIsModalOpen(true);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <TodoMetrics todos={todos} currentDate={currentDate} />

      <QuickAddTodo onAdd={handleQuickAdd} isSaving={isSaving} />

      <div className="flex flex-col gap-6">
        <TodoToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <TodoFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />

        {loadError ? (
          <div
            role="alert"
            aria-labelledby="todo-load-error-message"
            className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
          >
            <span id="todo-load-error-message">{loadError}</span>
            <button
              type="button"
              onClick={() => void fetchTodos(true)}
              aria-label="Retry loading objectives"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/30 px-3 py-2 text-xs font-semibold transition-colors hover:bg-danger/10"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-900/20 bg-zinc-950/5 px-3 py-2 sm:px-4 sm:py-2.5">
          <span
            className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em]"
            aria-live="polite"
          >
            {filteredTodos.length} Results Found
          </span>
          {activeFilter === "done" && counts.done > 0 && (
            <button
              onClick={clearCompleted}
              aria-label="Purge all completed objectives"
              className="inline-flex h-8 items-center rounded-full border border-danger/20 px-2.5 py-1 text-xs font-black uppercase tracking-[0.22em] text-danger transition-all hover:border-danger/50 hover:bg-danger/10"
            >
              Purge Completed
            </button>
          )}
        </div>

        {loading ? (
          <TodoLoading />
        ) : loadError && todos.length === 0 ? null : filteredTodos.length >
          0 ? (
          <motion.div
            layout
            className={cn(
              "grid gap-4 transition-all duration-500",
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1",
            )}
          >
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo) => (
                <TodoCard
                  key={todo._id}
                  todo={todo}
                  viewMode={viewMode}
                  onToggle={toggleComplete}
                  onEdit={(t) => {
                    setEditingTodo(t);
                    setIsModalOpen(true);
                  }}
                  onDelete={setConfirmDeleteId}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <TodoEmptyState />
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <TodoModal
            todo={editingTodo}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTodo}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Archive Objective?"
        description="This action will remove the objective from your current flow. Proceed with caution."
        onConfirm={() => confirmDeleteId && deleteTodo(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        action={toast.action}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
