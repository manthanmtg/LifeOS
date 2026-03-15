"use client";

import { useState, useEffect, useMemo } from "react";
import { Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface MaintenanceTask {
    payload: {
        name: string;
        status: string;
        next_due?: string;
        last_completed?: string;
        priority: string;
    };
}

export default function MaintenanceWidget() {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=maintenance_task")
            .then((r) => r.json())
            .then((d) => setTasks(d.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const now = new Date();
        const thirtyDaysLater = new Date(now);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let overdue = 0;
        let upcoming = 0;
        let completedThisMonth = 0;

        for (const t of tasks) {
            const p = t.payload;
            if (p.next_due) {
                const due = new Date(p.next_due);
                if (due < now && p.status !== "completed" && p.status !== "skipped") {
                    overdue++;
                } else if (due >= now && due <= thirtyDaysLater && p.status !== "completed") {
                    upcoming++;
                }
            }
            if (p.status === "completed" && p.last_completed) {
                const completed = new Date(p.last_completed);
                if (completed >= monthStart) {
                    completedThisMonth++;
                }
            }
        }

        return { total: tasks.length, overdue, upcoming, completedThisMonth };
    }, [tasks]);

    return (
        <WidgetCard
            title="Maintenance"
            icon={Wrench}
            loading={loading}
            href="/admin/maintenance"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-warning/80">
                        <Clock className="w-3 h-3" /> {summary.upcoming} Due Soon
                    </span>
                    <span className="flex items-center gap-1.5 text-success/80">
                        <CheckCircle2 className="w-3 h-3" /> {summary.completedThisMonth} Done
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">maintenance tasks tracked</p>
                </div>

                {summary.overdue > 0 ? (
                    <div className="p-3 rounded-xl border border-danger/20 bg-danger/20">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
                            <p className="text-[13px] text-danger font-medium leading-relaxed">
                                {summary.overdue} overdue task{summary.overdue !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <p className="text-[10px] text-danger/60 mt-1 ml-5.5">needs immediate attention</p>
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
                        <p className="text-[11px] text-zinc-500 text-center font-medium">All tasks up to date.</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
