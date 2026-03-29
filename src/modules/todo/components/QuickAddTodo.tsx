"use client";

import { useState } from "react";
import { Plus, Command, Flag } from "lucide-react";
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
    if (!title.trim() || isSaving) return;
    await onAdd(title, priority);
    setTitle("");
    setPriority("medium");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative group bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-2 transition-all focus-within:border-accent/40 focus-within:shadow-2xl focus-within:shadow-accent/5 mb-8"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Plus className={cn(
              "w-5 h-5 transition-all duration-500",
              isSaving ? "text-accent animate-spin" : "text-zinc-600 group-focus-within:text-accent group-focus-within:rotate-90"
            )} />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
            placeholder="What objective will you conquer next?"
            className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:ring-0 transition-all font-medium"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-950/40 p-1 rounded-2xl border border-zinc-800/40">
          {(["low", "medium", "high"] as TodoPriority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              disabled={isSaving}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                priority === p
                  ? p === "high"
                    ? "bg-danger text-zinc-950 shadow-lg shadow-danger/20"
                    : p === "medium"
                    ? "bg-warning text-zinc-950 shadow-lg shadow-warning/20"
                    : "bg-success text-zinc-950 shadow-lg shadow-success/20"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!title.trim() || isSaving}
          className="flex items-center justify-center w-11 h-11 bg-accent text-zinc-950 rounded-2xl hover:bg-accent-hover transition-all disabled:opacity-0 disabled:scale-90 active:scale-95 shadow-lg shadow-accent/20"
        >
          <Command className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
