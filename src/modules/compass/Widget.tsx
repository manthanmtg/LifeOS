"use client";

import { useState, useEffect } from "react";
import { CompassTask } from "./types";
import { AlertCircle, Map, CheckCircle } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

export default function CompassWidget() {
    const [tasks, setTasks] = useState<CompassTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=compass_task")
            .then(r => r.json())
            .then(d => {
                setTasks(d.data || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const inProgress = tasks.filter(t => t.payload.status === "in_progress");
    const critical = inProgress.filter(t => t.payload.priority === "p1");
    const review = tasks.filter(t => t.payload.status === "review");

    return (
        <WidgetCard
            title="Compass"
            icon={Map}
            loading={loading}
            href="/admin/compass"
            accentColor="orange-500"
            footer={
                <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider text-zinc-500">
                    <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {inProgress.length} In Progress
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div className="space-y-1">
                    <p className="text-xl font-bold text-zinc-50 tracking-tight leading-tight">Focus Protocol</p>
                    <p className="text-xs text-zinc-500 font-medium">
                        {inProgress.length === 0
                            ? "No active tasks in progress."
                            : "Directly engaged in execution zones."}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    {critical.length > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <span className="flex items-center gap-1.5 text-red-400">
                                <AlertCircle className="w-3 h-3" /> Critical Path
                            </span>
                            <span className="text-red-400">{critical.length}</span>
                        </div>
                    )}

                    {review.length > 0 && (
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <span className="flex items-center gap-1.5 text-yellow-400">
                                <CheckCircle className="w-3 h-3" /> Under Review
                            </span>
                            <span className="text-yellow-400">{review.length}</span>
                        </div>
                    )}
                </div>
            </div>
        </WidgetCard>
    );
}
