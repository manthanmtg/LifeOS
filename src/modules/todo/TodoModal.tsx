"use client";

import { useState } from "react";
import { X, Calendar, AlignLeft, CheckSquare, Save, Flag } from "lucide-react";
import { TodoDocument, TodoPayload, TodoPriority } from "./types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TodoModalProps {
    todo?: TodoDocument;
    onClose: () => void;
    onSave: (payload: TodoPayload) => void;
}

export default function TodoModal({ todo, onClose, onSave }: TodoModalProps) {
    const [title, setTitle] = useState(todo?.payload.title || "");
    const [notes, setNotes] = useState(todo?.payload.notes || "");
    const [dueDate, setDueDate] = useState(todo?.payload.due_date ? todo.payload.due_date.split("T")[0] : "");
    const [priority, setPriority] = useState<TodoPriority>(todo?.payload.priority || "medium");
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSaving(true);
        const payload: TodoPayload = {
            ...todo?.payload,
            title: title.trim(),
            notes: notes.trim() || undefined,
            due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            priority,
            completed: todo?.payload.completed || false,
        };

        await onSave(payload);
        setIsSaving(false);
        onClose();
    };

    return (
        /* Overlay */
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sheet / Modal panel */}
            <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full md:max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto overscroll-contain"
            >
                {/* Drag handle — mobile only */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-zinc-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-4 md:pt-6 border-b border-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-accent" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-50">{todo ? "Edit Task" : "New Task"}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl transition-all touch-manipulation"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form — pb includes safe-area-inset-bottom for iOS notch */}
                <form onSubmit={handleSubmit} className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">
                            Task Title
                        </label>
                        <input
                            autoFocus={typeof window !== "undefined" && window.innerWidth >= 768}
                            type="text"
                            inputMode="text"
                            enterKeyHint="next"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's on your mind?"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <AlignLeft className="w-3 h-3" /> Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add some details..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all resize-none"
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Flag className="w-3 h-3" /> Priority
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["low", "medium", "high"] as TodoPriority[]).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={cn(
                                        "px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border touch-manipulation",
                                        priority === p
                                            ? p === "high"
                                                ? "bg-danger/20 border-danger/40 text-danger"
                                                : p === "medium"
                                                    ? "bg-warning/20 border-warning/40 text-warning"
                                                    : "bg-success/20 border-success/40 text-success"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Due Date
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all [color-scheme:dark]"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] bg-accent text-accent-foreground px-6 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 touch-manipulation active:scale-[0.98]"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : todo ? "Save Changes" : "Create Task"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
