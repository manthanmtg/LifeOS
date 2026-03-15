"use client";

import { useState, useEffect } from "react";
import { BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface MetricEvent {
    timestamp: string;
}

export default function AnalyticsWidget() {
    const [todayCount, setTodayCount] = useState(0);
    const [yesterdayCount, setYesterdayCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/metrics?days=2")
            .then((r) => r.json())
            .then((d) => {
                const events = d.data || [];
                const today = new Date().toISOString().split("T")[0];
                const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
                setTodayCount(events.filter((e: MetricEvent) => e.timestamp.startsWith(today)).length);
                setYesterdayCount(events.filter((e: MetricEvent) => e.timestamp.startsWith(yesterday)).length);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const trend = todayCount - yesterdayCount;

    return (
        <WidgetCard
            title="Insights"
            icon={BarChart3}
            loading={loading}
            href="/admin/analytics"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    {trend !== 0 ? (
                        <span className={cn(
                            "flex items-center gap-1",
                            trend > 0 ? "text-success" : "text-danger"
                        )}>
                            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(trend)} vs yesterday
                        </span>
                    ) : (
                        <span className="text-zinc-500">Stability maintained</span>
                    )}
                </div>
            }
        >
            <div className="py-2">
                <p className="text-4xl font-bold text-zinc-50 tracking-tight">{todayCount}</p>
                <p className="text-xs text-zinc-500 mt-1 font-medium">real-time engagements today</p>
            </div>
        </WidgetCard>
    );
}
