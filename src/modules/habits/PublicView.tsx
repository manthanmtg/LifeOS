"use client";

import { Target, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface Habit {
    _id: string;
    payload: {
        name: string; description?: string; frequency: string;
        target_count: number; color: string;
        completions: { date: string; count: number }[];
    };
}

function getDateStr(d: Date): string { return d.toISOString().split("T")[0]; }

function getStreak(completions: { date: string; count: number }[]): number {
    const dateSet = new Set(completions.filter((c) => c.count > 0).map((c) => c.date));
    const today = new Date();
    let current = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (dateSet.has(getDateStr(d))) current++;
        else break;
    }
    return current;
}

function getLast30Days(): string[] {
    const arr: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        arr.push(getDateStr(d));
    }
    return arr;
}

export default function HabitsPublicView({ items }: { items: Record<string, unknown>[] }) {
    const habits = items as unknown as Habit[];
    const days = getLast30Days();

    if (habits.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No habits tracked yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {habits.map((habit) => {
                const completionSet = new Set(habit.payload.completions.filter((c) => c.count > 0).map((c) => c.date));
                const streak = getStreak(habit.payload.completions);
                const rate30 = days.filter((d) => completionSet.has(d)).length;

                return (
                    <div key={habit._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.payload.color }} />
                                <div>
                                    <p className="text-sm font-semibold text-zinc-50">{habit.payload.name}</p>
                                    {habit.payload.description && <p className="text-xs text-zinc-500">{habit.payload.description}</p>}
                                </div>
                            </div>
                            {streak > 0 && (
                                <div className="flex items-center gap-1 text-orange-400">
                                    <Flame className="w-4 h-4" />
                                    <span className="text-sm font-bold">{streak}</span>
                                </div>
                            )}
                        </div>
                        {/* Mini heatmap — last 30 days */}
                        <div className="flex gap-[3px] flex-wrap">
                            {days.map((day) => (
                                <div key={day} title={day}
                                    className={cn("w-3 h-3 rounded-sm transition-colors", completionSet.has(day) ? "opacity-100" : "bg-zinc-800 opacity-50")}
                                    style={completionSet.has(day) ? { backgroundColor: habit.payload.color } : undefined} />
                            ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                            <span className="capitalize">{habit.payload.frequency}</span>
                            <span>{rate30}/30 days completed</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
