"use client";

import { useMemo } from "react";
import { CalendarDays, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface RecurringExpense {
  _id: string;
  payload: {
    name: string;
    cost: number;
    currency: string;
    billing_cycle: string;
    category: string;
    next_renewal_date: string;
    is_active: boolean;
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  CNY: "¥",
  BRL: "R$",
};

function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

function formatRecurringAmount(amount: number, currency: string): string {
  return formatCurrency(amount, currencySymbol(currency), "western", 2);
}

function monthlyEquivalent(cost: number, cycle: string): number {
  if (cycle === "yearly") return cost / 12;
  if (cycle === "quarterly") return cost / 3;
  if (cycle === "weekly") return cost * 4.33;
  if (cycle === "daily") return cost * 30.44;
  return cost;
}

export default function RecurringExpensesPublicView({
  items,
}: {
  items: Record<string, unknown>[];
}) {
  const {
    subs,
    totalMonthly,
    totalYearly,
    hasSingleCurrency,
    primaryCurrency,
    nextUp,
    byCategory,
  } = useMemo(() => {
    const activeSubs = (items as unknown as RecurringExpense[]).filter(
      (s) => s.payload.is_active,
    );

    const enrichedSubs = activeSubs.map((sub) => {
      const dateObj = new Date(sub.payload.next_renewal_date);
      return {
        ...sub,
        _parsedDate: dateObj.getTime(),
        _formattedDate: dateObj.toLocaleDateString(),
        _monthlyCost: monthlyEquivalent(
          sub.payload.cost,
          sub.payload.billing_cycle,
        ),
      };
    });

    const totalMonthly = enrichedSubs.reduce(
      (s, sub) => s + sub._monthlyCost,
      0,
    );
    const totalYearly = totalMonthly * 12;

    const currencies = new Set(enrichedSubs.map((sub) => sub.payload.currency));
    const hasSingleCurrency = currencies.size <= 1;
    const primaryCurrency = enrichedSubs[0]?.payload.currency ?? "USD";

    const nextUp = [...enrichedSubs]
      .sort((a, b) => a._parsedDate - b._parsedDate)
      .slice(0, 3);

    const byCategory = Object.entries(
      enrichedSubs.reduce<Record<string, number>>((acc, item) => {
        acc[item.payload.category] =
          (acc[item.payload.category] || 0) + item._monthlyCost;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      subs: enrichedSubs,
      totalMonthly,
      totalYearly,
      hasSingleCurrency,
      primaryCurrency,
      nextUp,
      byCategory,
    };
  }, [items]);

  if (subs.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-14 px-4 border border-zinc-800 rounded-2xl bg-zinc-900/40">
        <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No recurring expenses shared yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-zinc-500 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Expense Snapshot
            </p>
            <p className="text-2xl md:text-3xl font-bold text-zinc-50">
              {hasSingleCurrency
                ? formatRecurringAmount(totalMonthly, primaryCurrency)
                : `${totalMonthly.toFixed(2)} /mo`}
            </p>
            {!hasSingleCurrency && (
              <p className="text-xs text-zinc-500 mt-1">Mixed currencies</p>
            )}
            <p className="text-sm text-zinc-400 mt-1">monthly burn</p>
          </div>
          <div className="text-right text-xs text-zinc-400">
            <p>{subs.length} active services</p>
            <p className="mt-1">
              {hasSingleCurrency
                ? formatRecurringAmount(totalYearly, primaryCurrency)
                : `${totalYearly.toFixed(0)}/year`}
            </p>
          </div>
        </div>

        {nextUp.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap gap-2">
            {nextUp.map((item) => (
              <span
                key={item._id}
                className="text-xs px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800/80 text-zinc-300"
              >
                {item.payload.name} · {item._formattedDate}
              </span>
            ))}
          </div>
        )}
      </div>

      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byCategory.map(([category, monthly]) => (
            <div
              key={category}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
            >
              <p className="text-xs text-zinc-500 uppercase tracking-wide">
                {category}
              </p>
              <p className="text-sm font-semibold text-zinc-100 mt-1">
                {hasSingleCurrency
                  ? formatRecurringAmount(monthly, primaryCurrency)
                  : `${monthly.toFixed(0)}/mo`}
              </p>
              {!hasSingleCurrency && (
                <p className="text-xs text-zinc-500 mt-1">mixed currencies</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subs.map((s) => (
          <div
            key={s._id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 transition-all duration-200 hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-sm hover:shadow-zinc-950/50"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-50">
                {s.payload.name}
              </p>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border",
                  "bg-zinc-800 border-zinc-700 text-zinc-300",
                )}
              >
                {s.payload.billing_cycle}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{s.payload.category}</p>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-xl font-bold text-zinc-50">
                {formatRecurringAmount(s.payload.cost, s.payload.currency)}
              </span>
              <span className="text-xs text-zinc-500">
                /{s.payload.billing_cycle}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {s._formattedDate}
              </span>
              <span>
                {formatRecurringAmount(s._monthlyCost, s.payload.currency)}/mo
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
