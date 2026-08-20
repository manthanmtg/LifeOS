"use client";

import { useState } from "react";
import { Plus, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoPriority } from "../types";

interface QuickAddTodoProps {
  onAdd: (title: string, priority: TodoPriority) => Promise<void>;
  isSaving: boolean;
}

export default function QuickAddTodo({ onAdd, isSaving }: QuickAddTodoProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) return;
    await onAdd(trimmedTitle, priority);
    setTitle("");
    setPriority("medium");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative group bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-2 transition-all focus-within:border-accent/40 focus-within:shadow-2xl focus-within:shadow-accent/5 mb-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full min-w-0 flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Plus
              className={cn(
                "w-5 h-5 transition-all duration-500",
                isSaving
                  ? "text-accent animate-spin"
                  : "text-zinc-600 group-focus-within:text-accent group-focus-within:rotate-90",
              )}
            />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
            placeholder="What objective will you conquer next?"
            aria-label="Task title"
            className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:ring-0 transition-all font-medium"
          />
        </div>

        <div
          className="flex w-full items-center gap-1 bg-zinc-950/40 p-1 rounded-2xl border border-zinc-800/40 sm:w-auto"
          role="group"
          aria-label="Set task priority"
        >
          {(["low", "medium", "high"] as TodoPriority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              disabled={isSaving}
              aria-label={`${p} priority`}
              aria-pressed={priority === p}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all sm:flex-none",
                priority === p
                  ? p === "high"
                    ? "bg-danger text-zinc-950 shadow-lg shadow-danger/20"
                    : p === "medium"
                      ? "bg-warning text-zinc-950 shadow-lg shadow-warning/20"
                      : "bg-success text-zinc-950 shadow-lg shadow-success/20"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!title.trim() || isSaving}
          aria-label="Add task"
          className="flex h-11 w-full items-center justify-center bg-accent text-zinc-950 rounded-2xl hover:bg-accent-hover transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-accent/20 sm:w-11"
        >
          <Command className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
