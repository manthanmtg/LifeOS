"use client";

import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
    Housing: "bg-blue-500/15 text-blue-400", Food: "bg-orange-500/15 text-orange-400",
    Transportation: "bg-purple-500/15 text-purple-400", Utilities: "bg-warning/15 text-warning",
    Entertainment: "bg-pink-500/15 text-pink-400", "Tech/Recurring": "bg-cyan-500/15 text-cyan-400",
    Health: "bg-success/15 text-success", Other: "bg-zinc-500/15 text-zinc-400",
};

interface Expense {
    _id: string;
    payload: {
        amount: number; currency: string; description: string;
        category: string; date: string;
    };
}

export default function ExpensesPublicView({ items }: { items: Record<string, unknown>[] }) {
    const expenses = (items as unknown as Expense[]).sort((a, b) => new Date(b.payload.date).getTime() - new Date(a.payload.date).getTime());

    if (expenses.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No expenses shared yet.</p>
            </div>
        );
    }

    const total = expenses.reduce((s, e) => s + e.payload.amount, 0);
    const catTotals: Record<string, number> = {};
    expenses.forEach((e) => { catTotals[e.payload.category] = (catTotals[e.payload.category] || 0) + e.payload.amount; });
    const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                <span className="text-sm text-zinc-400">{expenses.length} expenses</span>
                <span className="text-lg font-semibold text-zinc-50">${total.toFixed(2)}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">By Category</h3>
                <div className="space-y-2">
                    {cats.map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between text-sm">
                            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", CATEGORY_COLORS[cat] || "bg-zinc-500/15 text-zinc-400")}>{cat}</span>
                            <span className="text-zinc-300">${amount.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                {expenses.slice(0, 20).map((exp) => (
                    <div key={exp._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-50 truncate">{exp.payload.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", CATEGORY_COLORS[exp.payload.category] || "bg-zinc-500/15 text-zinc-400")}>{exp.payload.category}</span>
                                <span className="text-xs text-zinc-500">{new Date(exp.payload.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <span className="text-lg font-semibold text-zinc-50 whitespace-nowrap">${exp.payload.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
