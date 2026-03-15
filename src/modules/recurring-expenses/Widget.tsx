"use client";

import { useState, useEffect } from "react";
import { Sparkles, Timer } from "lucide-react";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { formatNumber, type NumberFormat } from "@/lib/formatters";

interface Sub {
    payload: {
        name: string;
        cost: number;
        billing_cycle: string;
        next_renewal_date: string;
        is_active: boolean;
        enable_reminders: boolean;
    };
}

interface RecurringExpenseSettings {
    defaultCurrency: string;
    enableReminders: boolean;
    numberFormat: NumberFormat;
    [key: string]: unknown;
}

const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", BRL: "R$" };
const NOW_REFERENCE = Date.now();

function monthlyEquivalent(cost: number, cycle: string): number {
    if (cycle === "yearly") return cost / 12;
    if (cycle === "quarterly") return cost / 3;
    if (cycle === "weekly") return cost * 4.33;
    if (cycle === "daily") return cost * 30.44;
    return cost;
}

export default function RecurringExpensesWidget() {
    const { settings } = useModuleSettings<RecurringExpenseSettings>("recurringExpenseSettings", { defaultCurrency: "USD", enableReminders: true, numberFormat: "western" });
    const [subs, setSubs] = useState<Sub[]>([]);
    const [loading, setLoading] = useState(true);
    const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
    const format = settings.numberFormat || "western";

    useEffect(() => {
        fetch("/api/content?module_type=recurring_expense")
            .then((r) => r.json())
            .then((d) => setSubs(d.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const active = subs.filter((s) => s.payload.is_active);
    const totalBurn = active.reduce((s, sub) => s + monthlyEquivalent(sub.payload.cost, sub.payload.billing_cycle), 0);
    const overdueCount = active.filter((s) => {
        const days = Math.ceil((new Date(s.payload.next_renewal_date).getTime() - NOW_REFERENCE) / (1000 * 60 * 60 * 24));
        return days < 0;
    }).length;

    const nextRenewal = active
        .filter((s) => s.payload.enable_reminders !== false)
        .sort((a, b) => new Date(a.payload.next_renewal_date).getTime() - new Date(b.payload.next_renewal_date).getTime())[0];

    const daysUntilNext = nextRenewal
        ? Math.ceil((new Date(nextRenewal.payload.next_renewal_date).getTime() - NOW_REFERENCE) / (1000 * 60 * 60 * 24))
        : null;

    const dueSoonCount = active.filter((s) => {
        const days = Math.ceil((new Date(s.payload.next_renewal_date).getTime() - NOW_REFERENCE) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 7;
    }).length;

    return (
        <WidgetCard
            title="Subscriptions"
            icon={Sparkles}
            loading={loading}
            href="/admin/recurring-expenses"
            footer={
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <span className={cn("flex items-center gap-1", overdueCount > 0 ? "text-danger" : "text-zinc-500")}>
                        {overdueCount} Overdue
                    </span>
                    <span className="text-zinc-800">•</span>
                    <span className={cn("flex items-center gap-1", dueSoonCount > 0 ? "text-warning" : "text-zinc-500")}>
                        {dueSoonCount} Due Soon
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">
                        <span className="text-zinc-500 mr-1 text-2xl font-medium">{sym}</span>
                        {formatNumber(totalBurn, format)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">monthly projection · {active.length} active expenses</p>
                </div>

                {settings.enableReminders && nextRenewal && (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Next Renewal</p>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                daysUntilNext !== null && daysUntilNext < 3 ? "text-danger" : "text-zinc-400"
                            )}>
                                {daysUntilNext !== null && daysUntilNext < 0 ? `overdue` : daysUntilNext === 0 ? "today" : daysUntilNext === 1 ? "tomorrow" : `in ${daysUntilNext}d`}
                            </span>
                        </div>
                        <p className="text-[13px] text-zinc-300 font-medium line-clamp-1">{nextRenewal.payload.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center gap-1 uppercase font-bold tracking-wider">
                            <Timer className="w-3 h-3" />
                            {new Date(nextRenewal.payload.next_renewal_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}

