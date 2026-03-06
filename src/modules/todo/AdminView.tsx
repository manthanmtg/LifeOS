"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Search, Calendar, CheckCircle2, Trash2, Edit2, Clock, Filter, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { TodoDocument, TodoPayload } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import TodoModal from "./TodoModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";

export default function TodoAdminView() {
    const [todos, setTodos] = useState<TodoDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");
    const [quickAddTitle, setQuickAddTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"recent" | "due_date">("recent");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoDocument | undefined>(undefined);

    // Undo & Delayed Delete state
    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastDeletedTodoRef = useRef<{ todo: TodoDocument, index: number } | null>(null);

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
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = "success", action?: { label: string; onClick: () => void }) => {
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
                setTodos(prev => prev.map(t => t._id === editingTodo._id ? data.data : t));
                showToast("Task updated", "success");
            } else {
                const res = await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "todo", is_public: false, payload }),
                });
                if (!res.ok) throw new Error("Failed to create todo");
                const data = await res.json();
                setTodos(prev => [data.data, ...prev]);
                showToast("Task created", "success");
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to save todo", "error");
        }
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = quickAddTitle.trim();
        if (!title) return;

        setIsSaving(true);
        const payload: TodoPayload = {
            title,
            completed: false,
        };

        try {
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module_type: "todo", is_public: false, payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add todo");
            setTodos(prev => [data.data, ...prev]);
            setQuickAddTitle("");
            showToast("Task added", "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to add todo", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleComplete = async (todo: TodoDocument) => {
        const updatedPayload: TodoPayload = {
            ...todo.payload,
            completed: !todo.payload.completed,
            completed_at: !todo.payload.completed ? new Date().toISOString() : undefined,
        };

        // Optimistic update
        setTodos(prev => prev.map(t => t._id === todo._id ? { ...t, payload: updatedPayload } : t));

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
        const todoToDelete = todos.find(t => t._id === id);
        if (!todoToDelete) return;

        const index = todos.findIndex(t => t._id === id);

        // Optimistic UI update
        setTodos(prev => prev.filter(t => t._id !== id));
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
            onClick: () => handleUndo()
        });
    };

    const handleUndo = () => {
        if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
        }

        const lastDeleted = lastDeletedTodoRef.current;
        if (lastDeleted) {
            setTodos(prev => {
                const updated = [...prev];
                updated.splice(lastDeleted.index, 0, lastDeleted.todo);
                // Future-proofing: Ensure orders are synced if we add DND reordering
                const reSynced = updated.map((todo, idx) => ({
                    ...todo,
                    payload: { ...todo.payload, order: idx }
                }));
                return reSynced;
            });
            lastDeletedTodoRef.current = null;
            setTimeout(() => showToast("Deletion undone", "success"), 50);
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
        .filter(t => t.payload && t.payload.completed === (activeTab === "done"))
        .filter(t => t.payload?.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (activeTab === "done") {
                return new Date(b.payload?.completed_at || b.updated_at).getTime() - new Date(a.payload?.completed_at || a.updated_at).getTime();
            }
            if (sortBy === "due_date") {
                if (!a.payload?.due_date) return 1;
                if (!b.payload?.due_date) return -1;
                return new Date(a.payload.due_date).getTime() - new Date(b.payload.due_date).getTime();
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-50 font-outfit">Task Manager</h1>
                    <p className="text-zinc-500 text-sm">Keep track of your daily objectives</p>
                </div>

                <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                    <button
                        onClick={() => setActiveTab("todo")}
                        className={cn(
                            "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
                            activeTab === "todo" ? "bg-zinc-800 text-zinc-50 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        TODO
                    </button>
                    <button
                        onClick={() => setActiveTab("done")}
                        className={cn(
                            "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
                            activeTab === "done" ? "bg-zinc-800 text-zinc-50 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Done
                    </button>
                </div>
            </div>

            {/* Quick Add & Search */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <form onSubmit={handleQuickAdd} className="lg:col-span-2 relative group flex items-center gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Plus className={cn("w-5 h-5 transition-colors", isSaving ? "text-accent animate-spin" : "text-zinc-500 group-focus-within:text-accent")} />
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
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-zinc-400 hover:text-accent hover:border-accent/40 transition-all shadow-sm"
                        title="Expanded Task Editor"
                    >
                        <Filter className="w-5 h-5 rotate-90" />
                    </button>
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
            <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] ml-1">
                    {activeTab === "todo" ? `${filteredTodos.length} Active Tasks` : `${filteredTodos.length} Completed`}
                </span>

                {activeTab === "todo" && (
                    <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
                        <button
                            onClick={() => setSortBy("recent")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                sortBy === "recent" ? "bg-zinc-800 text-accent" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Clock className="w-3 h-3" /> Recent
                        </button>
                        <button
                            onClick={() => setSortBy("due_date")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                sortBy === "due_date" ? "bg-zinc-800 text-accent" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Calendar className="w-3 h-3" /> Due Date
                        </button>
                    </div>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 pb-8">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredTodos.length > 0 ? (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredTodos.map((todo) => (
                                <motion.div
                                    key={todo._id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={cn(
                                        "group bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 hover:border-accent/20 transition-all shadow-sm hover:shadow-accent/5",
                                        todo.payload.completed && "opacity-50 grayscale-[0.5]"
                                    )}
                                >
                                    <button
                                        onClick={() => toggleComplete(todo)}
                                        className="relative group shrink-0"
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            todo.payload.completed
                                                ? "bg-emerald-500 border-emerald-500"
                                                : "border-zinc-700 group-hover:border-accent"
                                        )}>
                                            {todo.payload.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            {!todo.payload.completed && <div className="w-2 h-2 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </div>
                                    </button>

                                    <div className="flex-1 min-w-0 py-1">
                                        <h3 className={cn(
                                            "text-sm font-semibold text-zinc-100 truncate transition-all tracking-tight",
                                            todo.payload.completed && "line-through text-zinc-500"
                                        )}>
                                            {todo.payload.title}
                                        </h3>
                                        {todo.payload.notes && (
                                            <p className="text-xs text-zinc-500 truncate mt-0.5 font-medium">{todo.payload.notes}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditModal(todo)}
                                            className="p-2 text-zinc-500 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(todo._id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {todo.payload.due_date && (
                                        <div className={cn(
                                            "hidden md:flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0",
                                            todo.payload.completed
                                                ? "bg-zinc-900 border-zinc-800 text-zinc-600"
                                                : new Date(todo.payload.due_date) < new Date()
                                                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                                        )}>
                                            <Calendar className="w-3 h-3" />
                                            {new Date(todo.payload.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-3xl">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6">
                            <CheckSquare className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-500">No tasks found in this view</p>
                        <p className="text-xs text-zinc-600 mt-1">Start by adding a new objective above</p>
                    </div>
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
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
}
