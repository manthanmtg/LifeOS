"use client";

import { useState, useEffect } from "react";
import { Banknote, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import WidgetCard from "@/components/dashboard/WidgetCard";
import { formatCurrency, type NumberFormat } from "@/lib/formatters";

interface Expense {
    payload: { amount: number; category: string; date: string };
}

interface ExpenseSettings {
    defaultCurrency: string;
    numberFormat: NumberFormat;
    [key: string]: unknown;
}

const CURR_SYM: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", CHF: "CHF", CNY: "¥", BRL: "R$" };

export default function ExpensesWidget() {
    const { settings } = useModuleSettings<ExpenseSettings>("expenseSettings", { defaultCurrency: "USD", numberFormat: "western" });
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const sym = CURR_SYM[settings.defaultCurrency] || settings.defaultCurrency;
    const format = settings.numberFormat || "western";

    useEffect(() => {
        fetch("/api/content?module_type=expense")
            .then((r) => r.json())
            .then((d) => setExpenses(d.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();
    const thisMonth = expenses.filter((e) => {
        const d = new Date(e.payload.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = expenses.filter((e) => {
        const d = new Date(e.payload.date);
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const totalThisMonth = thisMonth.reduce((s, e) => s + e.payload.amount, 0);
    const totalLastMonth = lastMonth.reduce((s, e) => s + e.payload.amount, 0);
    const trend = totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0;

    const categoryTotals = thisMonth.reduce<Record<string, number>>((acc, e) => {
        acc[e.payload.category] = (acc[e.payload.category] || 0) + e.payload.amount;
        return acc;
    }, {});
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return (
        <WidgetCard
            title="Expenses"
            icon={Banknote}
            loading={loading}
            href="/admin/expenses"
            footer={
                <div className="flex items-center justify-between">
                    {trend !== 0 ? (
                        <span className={cn(
                            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                            trend > 0 ? "text-danger" : "text-success"
                        )}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(trend).toFixed(0)}% vs last month
                        </span>
                    ) : <div />}
                    {topCategory && (
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Top: {topCategory[0]}</span>
                    )}
                </div>
            }
        >
            <div className="py-2">
                <p className="text-4xl font-bold text-zinc-50 tracking-tight">
                    <span className="text-zinc-500 mr-1 text-2xl font-medium">{sym}</span>
                    {formatCurrency(totalThisMonth, "", format).replace(/^/, "")}
                </p>
                <p className="text-xs text-zinc-500 mt-1 font-medium">this month</p>
            </div>
        </WidgetCard>
    );
}

