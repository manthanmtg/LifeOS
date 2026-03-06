"use client";

import { useState } from "react";
import { X, Calendar, AlignLeft, CheckSquare, Save } from "lucide-react";
import { TodoDocument, TodoPayload } from "./types";
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
            completed: todo?.payload.completed || false,
        };

        await onSave(payload);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
            >
                <div className="flex items-center justify-between p-6 border-b border-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-accent" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-50">{todo ? "Edit Task" : "New Task"}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Task Title</label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <AlignLeft className="w-3 h-3" /> Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add some details..."
                                rows={4}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] bg-accent text-accent-foreground px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
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
