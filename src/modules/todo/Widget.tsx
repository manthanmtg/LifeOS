"use client";

import { useState, useEffect } from "react";
import { CheckSquare, ListTodo, CheckCircle2 } from "lucide-react";
import { TodoDocument } from "./types";
import WidgetCard from "@/components/dashboard/WidgetCard";

export default function TodoWidget() {
    const [todos, setTodos] = useState<TodoDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=todo")
            .then(r => r.json())
            .then(d => setTodos(d.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const activeTodos = todos.filter(t => t.payload && !t.payload.completed).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentlyDone = todos.filter(t => t.payload && t.payload.completed).sort((a, b) => new Date(b.payload?.completed_at || b.updated_at).getTime() - new Date(a.payload?.completed_at || a.updated_at).getTime());

    return (
        <WidgetCard
            title="Tasks"
            icon={CheckSquare}
            loading={loading}
            href="/admin/todo"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {activeTodos.length} Active
                    </span>
                    <span className="text-zinc-500">
                        {recentlyDone.length} Done
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div className="space-y-1">
                    <p className="text-xl font-bold text-zinc-50 tracking-tight leading-tight">Master Checklist</p>
                    <p className="text-xs text-zinc-500 font-medium">
                        {activeTodos.length === 0 ? "All objectives secured." : `${activeTodos.length} pending operations.`}
                    </p>
                </div>

                <div className="space-y-2">
                    {activeTodos.slice(0, 2).map(todo => (
                        <div key={todo._id} className="flex items-center gap-3 px-3 py-2 bg-zinc-950/40 border border-zinc-800/60 rounded-xl group/item">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            <span className="text-[11px] text-zinc-300 truncate font-medium">{todo.payload.title}</span>
                        </div>
                    ))}

                    {activeTodos.length === 0 && recentlyDone.length > 0 && (
                        <div className="flex items-center gap-3 px-3 py-2 bg-success/5 border border-success/10 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success/60 shrink-0" />
                            <span className="text-[11px] text-zinc-500 truncate line-through italic">Zero pending items</span>
                        </div>
                    )}

                    {todos.length === 0 && !loading && (
                        <div className="py-4 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl opacity-40">
                            <ListTodo className="w-5 h-5 text-zinc-600 mb-2" />
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Awaiting Input</span>
                        </div>
                    )}
                </div>
            </div>
        </WidgetCard>
    );
}
