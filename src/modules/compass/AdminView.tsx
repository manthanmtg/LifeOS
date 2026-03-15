"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompassTask } from "./types";
import WorkspaceModal from "./WorkspaceModal";

const PRIORITY_MAP = {
    p1: { label: "P1: Urgent", color: "text-danger bg-danger/10" },
    p2: { label: "P2: High", color: "text-orange-400 bg-orange-400/10" },
    p3: { label: "P3: Normal", color: "text-blue-400 bg-blue-400/10" },
    p4: { label: "P4: Low", color: "text-zinc-400 bg-zinc-400/10" },
    p5: { label: "P5: Backburner", color: "text-zinc-500 bg-zinc-800/50" },
};

const COLUMNS = [
    { id: "backlog", title: "Backlog", color: "bg-zinc-800" },
    { id: "in_progress", title: "In Progress", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { id: "review", title: "Review", color: "bg-warning/20 text-warning border-warning/30" },
    { id: "done", title: "Done", color: "bg-success/20 text-success border-success/30" },
] as const;

export default function CompassAdminView() {
    const [tasks, setTasks] = useState<CompassTask[]>([]);
    const [loading, setLoading] = useState(true);
    void loading;
    const [quickAddTitle, setQuickAddTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

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
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
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
            links: []
        };

        try {
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module_type: "compass_task", is_public: false, payload }),
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
        // Set visual drag image to be slightly transparent
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

        const taskIndex = tasks.findIndex(t => t._id === draggedTaskId);
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        if (task.payload.status === colId) return; // No change

        // Optimistic update
        const updatedTask = {
            ...task,
            payload: { ...task.payload, status: colId as CompassTask["payload"]["status"] }
        };

        const newTasks = [...tasks];
        newTasks[taskIndex] = updatedTask;
        setTasks(newTasks);
        setIsUpdatingId(draggedTaskId);

        // API update
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
            fetchTasks(); // rollback on failure
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

        // Optimistic delete
        setTasks(prev => prev.filter(t => t._id !== taskIdToDelete));

        try {
            const res = await fetch(`/api/content/${taskIdToDelete}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete task");
        } catch (err: unknown) {
            console.error("Failed to delete task", err);
            fetchTasks(); // rollback on failure
        } finally {
            setIsDeletingId(null);
        }
    };

    const getTasksByStatus = (status: string) => {
        return tasks.filter(t => t.payload.status === status)
            // Sort by updated_at desc usually, or created_at desc
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-fade-in-up">
            {/* Header & Quick Add */}
            <div className="flex items-center gap-6 shrink-0">
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
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all shadow-sm disabled:opacity-50"
                            disabled={isSaving}
                        />
                    </form>
                </div>

                <button
                    onClick={() => setFocusMode(!focusMode)}
                    aria-label={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors border",
                        focusMode
                            ? "bg-accent/20 border-accent/40 text-accent"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                    )}
                >
                    <CheckCircle className="w-4 h-4" />
                    {focusMode ? "Exit Focus Mode" : "Focus Mode"}
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex h-full gap-6 min-w-max">
                    {COLUMNS.filter(col => !focusMode || col.id === "in_progress").map(col => {
                        const colTasks = getTasksByStatus(col.id);
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
                                        <span className={cn("w-2 h-2 rounded-full", col.color.split(" ")[0])} />
                                        {col.title}
                                    </h3>
                                    <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                                        {colTasks.length}
                                    </span>
                                </div>

                                {/* Task List Container */}
                                <div className={cn(
                                    "flex-1 overflow-y-auto rounded-2xl p-2 transition-colors duration-200 border-2",
                                    isOver ? "bg-zinc-900 border-zinc-700 dashed" : "bg-transparent border-transparent"
                                )}>
                                    <div className="space-y-3">
                                        {colTasks.map((task) => {
                                            const ageDays = (Date.now() - new Date(task.updated_at || task.created_at).getTime()) / (1000 * 60 * 60 * 24);
                                            const isStuck = col.id === "in_progress" && ageDays > 7;

                                            return (
                                                <div
                                                    key={task._id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task._id)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => setSelectedTask(task)}
                                                    className={cn(
                                                        "bg-zinc-900 border border-zinc-800 p-4 rounded-xl cursor-pointer hover:border-zinc-600 transition-all shadow-sm group",
                                                        draggedTaskId === task._id && "opacity-50 scale-95",
                                                        isStuck && "border-yellow-500/30 bg-yellow-500/5"
                                                    )}
                                                >
                                                    <div className="flex gap-2 items-start justify-between mb-2">
                                                        <h4 className="text-sm font-medium text-zinc-300 leading-snug">
                                                            {task.payload.title}
                                                        </h4>
                                                        {(isUpdatingId === task._id || isDeletingId === task._id) && (
                                                            <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 items-center text-zinc-500 mt-3">
                                                        <span className={cn(
                                                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                            PRIORITY_MAP[task.payload.priority].color
                                                        )}>
                                                            {PRIORITY_MAP[task.payload.priority].label}
                                                        </span>
                                                        {task.payload.category_tags?.slice(0, 2).map(tag => (
                                                            <span key={tag} className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                                {tag}
                                                            </span>
                                                        ))}

                                                        <div className="ml-auto flex items-center gap-3">
                                                            {task.payload.checklist?.length > 0 && (
                                                                <span className="text-xs flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    {task.payload.checklist.filter(c => c.completed).length}/{task.payload.checklist.length}
                                                                </span>
                                                            )}
                                                            {isStuck && (
                                                                <span className="text-xs text-yellow-500/80 flex items-center gap-1" title="Stuck > 7 days">
                                                                    <Clock className="w-3 h-3" /> {Math.floor(ageDays)}d
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

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
            </div>

            {/* Drop to Delete Zone */}
            {draggedTaskId && (
                <div
                    className={cn(
                        "fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl border-2 flex items-center justify-center gap-3 transition-all duration-300 z-40 bg-zinc-950/90 backdrop-blur-md shadow-2xl",
                        draggedOverCol === "delete"
                            ? "border-danger scale-110 text-danger"
                            : "border-danger/30 text-danger/70"
                    )}
                    onDragOver={(e) => handleDragOver(e, "delete")}
                    onDragLeave={() => setDraggedOverCol(null)}
                    onDrop={handleDeleteDrop}
                >
                    <Trash2 className={cn("w-6 h-6", draggedOverCol === "delete" && "animate-bounce")} />
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
