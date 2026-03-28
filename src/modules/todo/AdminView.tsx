"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Filter,
  CheckSquare,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TodoDocument, TodoPayload, TodoPriority } from "./types";
import { AnimatePresence } from "framer-motion";
import TodoModal from "./TodoModal";
import TodoCard from "./components/TodoCard";
import TodoFilters, { TodoFilterType } from "./components/TodoFilters";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";

export default function TodoAdminView() {
  const [todos, setTodos] = useState<TodoDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TodoFilterType>("todo");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddPriority, setQuickAddPriority] =
    useState<TodoPriority>("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "due_date" | "priority">(
    "recent",
  );

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

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

  const showToast = (
    message: string,
    type: ToastType = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    setToast({ message, type, isVisible: true, action });
  };

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
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleSaveTodo = async (payload: TodoPayload) => {
    try {
      if (editingTodo) {
        const res = await fetch(`/api/content/${editingTodo._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
        if (!res.ok) throw new Error("Failed to update todo");
        const data = await res.json();
        setTodos((prev) =>
          prev.map((t) => (t._id === editingTodo._id ? data.data : t)),
        );
        showToast("Task updated", "success");
      } else {
        const res = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_type: "todo",
            is_public: false,
            payload,
          }),
        });
        if (!res.ok) throw new Error("Failed to create todo");
        const data = await res.json();
        setTodos((prev) => [data.data, ...prev]);
        showToast("Task created", "success");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save todo",
        "error",
      );
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickAddTitle.trim();
    if (!title) return;

    setIsSaving(true);
    const payload: TodoPayload = {
      title,
      priority: quickAddPriority,
      completed: false,
    };

    try {
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
      setQuickAddTitle("");
      setQuickAddPriority("medium");
      showToast("Task added", "success");
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

    // Optimistic update
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
      if (!res.ok) throw new Error("Failed to update todo");
    } catch {
      showToast("Failed to update status", "error");
      fetchTodos(); // Rollback
    }
  };

  const deleteTodo = async (id: string) => {
    const todoToDelete = todos.find((t) => t._id === id);
    if (!todoToDelete) return;

    const index = todos.findIndex((t) => t._id === id);

    // Optimistic UI update
    setTodos((prev) => prev.filter((t) => t._id !== id));
    lastDeletedTodoRef.current = { todo: todoToDelete, index };
    setConfirmDeleteId(null);

    // Schedule actual deletion
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);

    deleteTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        lastDeletedTodoRef.current = null;
      } catch (err) {
        console.error("Delayed delete failed:", err);
      }
    }, 5000);

    showToast("Task deleted", "success", {
      label: "Undo",
      onClick: () => handleUndo(),
    });
  };

  const handleUndo = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }

    const lastDeleted = lastDeletedTodoRef.current;
    if (lastDeleted) {
      setTodos((prev) => {
        const updated = [...prev];
        updated.splice(lastDeleted.index, 0, lastDeleted.todo);
        return updated;
      });
      lastDeletedTodoRef.current = null;
      setTimeout(() => showToast("Deletion undone", "success"), 50);
    }
  };

  const clearCompleted = async () => {
    const completedTodos = todos.filter((t) => t.payload.completed);
    if (completedTodos.length === 0) return;

    if (!confirm("Are you sure you want to permanently clear all completed tasks?")) return;

    try {
      showToast(`Clearing ${completedTodos.length} tasks...`, "info");
      await Promise.all(
        completedTodos.map((t) =>
          fetch(`/api/content/${t._id}`, { method: "DELETE" }),
        ),
      );
      setTodos((prev) => prev.filter((t) => !t.payload.completed));
      showToast("Completed tasks cleared", "success");
    } catch {
      showToast("Failed to clear some tasks", "error");
      fetchTodos();
    }
  };

  const openCreateModal = () => {
    setEditingTodo(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (todo: TodoDocument) => {
    setEditingTodo(todo);
    setIsModalOpen(true);
  };

  const filteredTodos = todos
    .filter((t) => {
      if (!t.payload) return false;
      const matchesSearch = t.payload.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const isCompleted = t.payload.completed;
      const dueDate = t.payload.due_date ? new Date(t.payload.due_date) : null;
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
        const pa = PRIORITY_ORDER[a.payload?.priority || "medium"];
        const pb = PRIORITY_ORDER[b.payload?.priority || "medium"];
        return pa - pb;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  const counts: Record<TodoFilterType, number> = {
    todo: todos.filter((t) => !t.payload?.completed).length,
    done: todos.filter((t) => t.payload?.completed).length,
    today: todos.filter((t) => {
      const dueDate = t.payload?.due_date ? new Date(t.payload.due_date) : null;
      return (
        !t.payload?.completed &&
        dueDate &&
        dueDate.toDateString() === new Date().toDateString()
      );
    }).length,
    overdue: todos.filter((t) => {
      const dueDate = t.payload?.due_date ? new Date(t.payload.due_date) : null;
      return !t.payload?.completed && dueDate && dueDate < new Date();
    }).length,
    high: todos.filter((t) => !t.payload?.completed && t.payload?.priority === "high")
      .length,
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 font-outfit">
            Task Manager
          </h1>
          <p className="text-zinc-500 text-sm">
            Keep track of your daily objectives
          </p>
        </div>

        {/* Tab switcher — full-width on mobile */}
        <div className="flex items-center gap-3">
          {activeFilter === "done" && counts.done > 0 && (
            <button
              onClick={clearCompleted}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-danger hover:bg-danger/10 transition-colors"
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>

      <TodoFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      {/* Quick Add & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form
          onSubmit={handleQuickAdd}
          className="lg:col-span-2 flex flex-col gap-3"
        >
          <div className="relative group flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Plus
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isSaving
                      ? "text-accent animate-spin"
                      : "text-zinc-500 group-focus-within:text-accent",
                  )}
                />
              </div>
              <input
                type="text"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all placeholder:text-zinc-600 shadow-sm"
                disabled={isSaving}
              />
            </div>
            {quickAddTitle.trim() && (
              <button
                type="submit"
                disabled={isSaving}
                className="md:hidden bg-accent text-accent-foreground p-4 rounded-2xl shadow-sm shrink-0 touch-manipulation disabled:opacity-50 transition-all active:scale-95"
                aria-label="Add task"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-zinc-400 hover:text-accent hover:border-accent/40 transition-all shadow-sm shrink-0 touch-manipulation"
              title="Expanded Task Editor"
            >
              <Filter className="w-5 h-5 rotate-90" />
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <div className="flex items-center gap-2 min-w-max">
              <Flag className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mr-1">
                Priority:
              </span>
              {(["low", "medium", "high"] as TodoPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuickAddPriority(p)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                    quickAddPriority === p
                      ? p === "high"
                        ? "bg-danger/20 border-danger/40 text-danger"
                        : p === "medium"
                          ? "bg-warning/20 border-warning/40 text-warning"
                          : "bg-success/20 border-success/40 text-success"
                      : "bg-transparent border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-zinc-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-600 shadow-sm"
          />
        </div>
      </div>

      {/* List Header / Sorting */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] shrink-0">
          {filteredTodos.length} Results
        </span>

        {activeFilter !== "done" && (
          <div className="overflow-x-auto scrollbar-none -mr-1 pr-1">
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 min-w-max">
              {(["recent", "due_date", "priority"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    sortBy === s
                      ? "bg-zinc-800 text-accent"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {s === "recent" ? (
                    <Clock className="w-3 h-3" />
                  ) : s === "due_date" ? (
                    <Calendar className="w-3 h-3" />
                  ) : (
                    <Flag className="w-3 h-3" />
                  )}
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="pb-24 md:pb-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredTodos.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo) => (
                <TodoCard
                  key={todo._id}
                  todo={todo}
                  onToggle={toggleComplete}
                  onEdit={openEditModal}
                  onDelete={setConfirmDeleteId}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6">
              <CheckSquare className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm font-semibold text-zinc-500">
              No tasks found in this view
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Start by adding a new objective above
            </p>
          </div>
        )}
      </div>

      {/* Mobile FAB — respects iOS safe-area-inset-bottom */}
      <button
        onClick={openCreateModal}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 z-40 md:hidden w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-2xl shadow-accent/30 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
        aria-label="Add task"
      >
        <Plus className="w-7 h-7" />
      </button>

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
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
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
