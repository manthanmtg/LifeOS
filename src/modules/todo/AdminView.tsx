"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TodoDocument, TodoPayload, TodoPriority } from "./types";
import { AnimatePresence, motion } from "framer-motion";

// Components
import TodoModal from "./TodoModal";
import TodoCard from "./components/TodoCard";
import TodoFilters, { TodoFilterType } from "./components/TodoFilters";
import TodoHeader from "./components/TodoHeader";
import TodoMetrics from "./components/TodoMetrics";
import QuickAddTodo from "./components/QuickAddTodo";

// UI Components
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";
import { Search, Clock, Calendar, Flag, CheckSquare } from "lucide-react";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function TodoAdminView() {
  const [todos, setTodos] = useState<TodoDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TodoFilterType>("todo");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "due_date" | "priority">(
    "recent",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

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

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/content?module_type=todo");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch todos");
      setTodos(data.data || []);
    } catch {
      showToast("Failed to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

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
        const isToday =
          dueDate && dueDate.toDateString() === new Date().toDateString();
        const isOverdue = dueDate && dueDate < new Date() && !isCompleted;
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
          if (!a.payload?.due_date) return 1;
          if (!b.payload?.due_date) return -1;
          return (
            new Date(a.payload.due_date).getTime() -
            new Date(b.payload.due_date).getTime()
          );
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
  }, [todos, searchQuery, activeFilter, sortBy]);

  const counts = useMemo(
    () => ({
      todo: todos.filter((t) => !t.payload?.completed).length,
      done: todos.filter((t) => t.payload?.completed).length,
      today: todos.filter((t) => {
        const dueDate = t.payload?.due_date
          ? new Date(t.payload.due_date)
          : null;
        return (
          !t.payload?.completed &&
          dueDate &&
          dueDate.toDateString() === new Date().toDateString()
        );
      }).length,
      overdue: todos.filter((t) => {
        const dueDate = t.payload?.due_date
          ? new Date(t.payload.due_date)
          : null;
        return (
          !t.payload?.completed &&
          dueDate &&
          dueDate < new Date() &&
          dueDate.toDateString() !== new Date().toDateString()
        );
      }).length,
      high: todos.filter(
        (t) => !t.payload?.completed && t.payload?.priority === "high",
      ).length,
    }),
    [todos],
  );

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <TodoHeader
        onAddTodo={() => {
          setEditingTodo(undefined);
          setIsModalOpen(true);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <TodoMetrics todos={todos} />

      <QuickAddTodo onAdd={handleQuickAdd} isSaving={isSaving} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-2 rounded-2xl">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Deep search objectives..."
              aria-label="Search objectives"
              className="w-full bg-zinc-950/30 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-accent/20 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-950/30 p-1 rounded-xl shrink-0" role="group" aria-label="Sort options">
            {(["recent", "due_date", "priority"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  sortBy === s
                    ? "bg-accent text-zinc-950 shadow-md"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
                )}
                title={`Sort by ${s.replace("_", " ")}`}
                aria-label={`Sort by ${s.replace("_", " ")}`}
                aria-pressed={sortBy === s}
              >
                {s === "recent" ? (
                  <Clock className="w-4 h-4" />
                ) : s === "due_date" ? (
                  <Calendar className="w-4 h-4" />
                ) : (
                  <Flag className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </div>

        <TodoFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
        />

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
            {filteredTodos.length} Results Found
          </span>
          {activeFilter === "done" && counts.done > 0 && (
            <button
              onClick={clearCompleted}
              className="text-[10px] font-black text-danger/60 hover:text-danger uppercase tracking-widest transition-colors"
            >
              Purge Completed
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-24 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredTodos.length > 0 ? (
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-[3rem]"
          >
            <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
              <CheckSquare className="w-10 h-10 text-zinc-800" />
            </div>
            <h3 className="text-xl font-black text-zinc-300 mb-2 italic">
              Clean Slate
            </h3>
            <p className="text-sm text-zinc-500 max-w-xs font-medium">
              Every great conquest begins with a single objective. Manifest your
              path above.
            </p>
          </motion.div>
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
