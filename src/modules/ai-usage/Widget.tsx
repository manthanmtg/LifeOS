"use client";

import { useState, useEffect } from "react";
import { Bot, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { formatNumber } from "@/lib/formatters";

interface AiUsageEntry {
    payload: {
        provider: string;
        cost: number;
        input_tokens: number;
        output_tokens: number;
        date: string;
    };
}

const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };

export default function AiUsageWidget() {
    const [entries, setEntries] = useState<AiUsageEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=ai_usage")
            .then((r) => r.json())
            .then((d) => setEntries(d.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();
    const thisMonth = entries.filter((e) => {
        const d = new Date(e.payload.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = entries.filter((e) => {
        const d = new Date(e.payload.date);
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const totalThisMonth = thisMonth.reduce((s, e) => s + e.payload.cost, 0);
    const totalLastMonth = lastMonth.reduce((s, e) => s + e.payload.cost, 0);
    const trend = totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0;

    const providerCounts = thisMonth.reduce<Record<string, number>>((acc, e) => {
        acc[e.payload.provider] = (acc[e.payload.provider] || 0) + 1;
        return acc;
    }, {});
    const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0];

    const totalTokens = thisMonth.reduce((s, e) => s + e.payload.input_tokens + e.payload.output_tokens, 0);

    return (
        <WidgetCard
            title="AI Usage"
            icon={Bot}
            loading={loading}
            href="/admin/ai-usage"
            footer={
                <div className="flex items-center justify-between">
                    {trend !== 0 ? (
                        <span className={cn(
                            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                            trend > 0 ? "text-red-400" : "text-green-400"
                        )}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(trend).toFixed(0)}% vs last month
                        </span>
                    ) : <div />}
                    {topProvider && (
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Top: {topProvider[0]}</span>
                    )}
                </div>
            }
        >
            <div className="py-2 space-y-3">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">
                        <span className="text-zinc-500 mr-1 text-2xl font-medium">{CURR_SYM.USD}</span>
                        {formatNumber(totalThisMonth, "western", 2)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">this month &middot; {thisMonth.length} calls</p>
                </div>
                {totalTokens > 0 && (
                    <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1">Tokens Used</p>
                        <p className="text-sm font-bold text-zinc-300">{formatNumber(totalTokens / 1000, "western", 1)}K</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}

