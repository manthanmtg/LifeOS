"use client";

import { useState, useEffect } from "react";
import { Target, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Habit {
    payload: { name: string; completions: { date: string; count: number }[] };
}

function todayStr(): string { return new Date().toISOString().split("T")[0]; }

export default function HabitsWidget() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch("/api/content?module_type=habit").then((r) => r.json()).then((d) => setHabits(d.data || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const today = todayStr();
    const completedToday = habits.filter((h) =>
        h.payload.completions.some((c) => c.date === today && c.count > 0)
    );

    return (
        <WidgetCard
            title="Habits"
            icon={Target}
            loading={loading}
            href="/admin/habits"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-green-400">
                        <Check className="w-3 h-3" /> {completedToday.length}/{habits.length} completed today
                    </span>
                </div>
            }
        >
            <div className="py-2">
                <p className="text-4xl font-bold text-zinc-50 tracking-tight">{habits.length}</p>
                <p className="text-xs text-zinc-500 mt-1 font-medium italic">active tracking protocols</p>
                <div className="mt-4 flex gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className={cn(
                            "w-2 h-2 rounded-full",
                            i < completedToday.length ? "bg-green-500" : "bg-zinc-800"
                        )} />
                    ))}
                </div>
            </div>
        </WidgetCard>
    );
}
