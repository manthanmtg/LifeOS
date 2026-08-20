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
  const [dueDate, setDueDate] = useState(
    todo?.payload.due_date ? todo.payload.due_date.split("T")[0] : "",
  );
  const [priority, setPriority] = useState<TodoPriority>(
    todo?.payload.priority || "medium",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    const payload: TodoPayload = {
      ...todo?.payload,
      title: title.trim(),
      notes: notes.trim() || undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      priority,
      completed: todo?.payload.completed || false,
    };

    try {
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  const priorityColors: Record<
    TodoPriority,
    { text: string; bg: string; border: string }
  > = {
    high: {
      text: "text-danger",
      bg: "bg-danger/10",
      border: "border-danger/20",
    },
    medium: {
      text: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
    },
    low: {
      text: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full md:max-w-xl bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800/50 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden"
      >
        <div className="flex justify-center pt-4 pb-2 md:hidden">
          <div className="w-12 h-1.5 rounded-full bg-zinc-800" />
        </div>

        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800/40">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all",
                priorityColors[priority].bg,
                priorityColors[priority].border,
              )}
            >
              <CheckSquare
                className={cn("w-6 h-6", priorityColors[priority].text)}
              />
            </div>
            <div>
              <h2
                id="modal-title"
                className="text-2xl font-black text-zinc-100 italic tracking-tight"
              >
                {todo ? "Edit Objective" : "New Objective"}
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mt-0.5">
                Refining the Path
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-3 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-3">
            <label
              htmlFor="todo-title"
              className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] ml-1"
            >
              Title of Conquest
            </label>
            <input
              id="todo-title"
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What will you conquer next?"
              className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl px-5 py-4 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold text-lg"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5" /> Priority Level
              </label>
              <div
                className="flex gap-2 bg-zinc-900/40 p-1.5 rounded-[1.5rem] border border-zinc-800/50"
                role="group"
                aria-label="Priority"
              >
                {(["low", "medium", "high"] as TodoPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    aria-pressed={priority === p}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                      priority === p
                        ? p === "high"
                          ? "bg-danger text-zinc-950 shadow-lg shadow-danger/20"
                          : p === "medium"
                            ? "bg-warning text-zinc-950 shadow-lg shadow-warning/20"
                            : "bg-success text-zinc-950 shadow-lg shadow-success/20"
                        : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="todo-date"
                className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"
              >
                <Calendar className="w-3.5 h-3.5" /> Deadline
              </label>
              <input
                id="todo-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-2xl px-5 py-3 text-zinc-100 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="todo-notes"
              className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"
            >
              <AlignLeft className="w-3.5 h-3.5" /> Intelligence Notes
            </label>
            <textarea
              id="todo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strategic details for the operation..."
              rows={4}
              className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] px-6 py-5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-4 pt-4 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all border border-zinc-900"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-[2] bg-accent text-zinc-950 px-8 py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-accent-hover transition-all shadow-2xl shadow-accent/20 disabled:opacity-50 group"
            >
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {isSaving ? "Syncing..." : todo ? "Update flow" : "Manifest task"}
            </button>
          </div>
        </form>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[100px] pointer-events-none" />
      </motion.div>
    </div>
  );
}
