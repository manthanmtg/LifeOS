"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "../lib/emi-utils";
import type { ScheduleRow } from "../types";

interface ScheduleCardsProps {
  rows: ScheduleRow[];
  currencySymbol: string;
  decimals: number;
  numberFormat: "western" | "indian";
  now: Date;
  initialCount?: number;
}

function groupByYear(rows: ScheduleRow[]) {
  return rows.reduce<Record<string, ScheduleRow[]>>((groups, row) => {
    const year = new Date(row.due_date).getFullYear().toString();
    groups[year] = groups[year] ?? [];
    groups[year].push(row);
    return groups;
  }, {});
}

export default function ScheduleCards({
  rows,
  currencySymbol,
  decimals,
  numberFormat,
  now,
  initialCount = 24,
}: ScheduleCardsProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [expanded, setExpanded] = useState<number | null>(null);
  const visibleRows = rows.slice(0, visibleCount);
  const grouped = useMemo(() => groupByYear(visibleRows), [visibleRows]);
  const nowMs = now.getTime();

  return (
    <div className="space-y-5 md:hidden">
      {Object.entries(grouped).map(([year, yearRows]) => (
        <section key={year} className="space-y-3">
          <h4 className="text-sm font-black text-zinc-300">{year}</h4>
          {yearRows.map((row) => {
            const isPaid = new Date(row.due_date).getTime() < nowMs;
            const isOpen = expanded === row.index;
            return (
              <button
                key={row.index}
                type="button"
                onClick={() => setExpanded(isOpen ? null : row.index)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4 text-left transition-colors hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-zinc-100">
                      Payment {row.index}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {row.due_date.slice(0, 10)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-bold",
                      isPaid
                        ? "border-success/20 bg-success/10 text-success"
                        : "border-warning/20 bg-warning/10 text-warning",
                    )}
                  >
                    {isPaid ? "Paid" : "Upcoming"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">EMI</p>
                    <p className="font-mono font-bold text-zinc-100">
                      {formatMoney(
                        row.emi,
                        currencySymbol,
                        decimals,
                        numberFormat,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Balance</p>
                    <p className="font-mono font-bold text-zinc-100">
                      {formatMoney(
                        row.closing_balance,
                        currencySymbol,
                        decimals,
                        numberFormat,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Principal</p>
                    <p className="font-mono font-bold text-zinc-300">
                      {formatMoney(
                        row.principal,
                        currencySymbol,
                        decimals,
                        numberFormat,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Interest</p>
                    <p className="font-mono font-bold text-zinc-300">
                      {formatMoney(
                        row.interest,
                        currencySymbol,
                        decimals,
                        numberFormat,
                      )}
                    </p>
                  </div>
                </div>

                {row.prepayment > 0 && (
                  <p className="mt-3 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
                    Extra payment{" "}
                    {formatMoney(
                      row.prepayment,
                      currencySymbol,
                      decimals,
                      numberFormat,
                    )}
                  </p>
                )}

                {isOpen && (
                  <div className="mt-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
                    Opening balance{" "}
                    <span className="font-mono text-zinc-300">
                      {formatMoney(
                        row.opening_balance,
                        currencySymbol,
                        decimals,
                        numberFormat,
                      )}
                    </span>{" "}
                    · Rate{" "}
                    <span className="font-mono text-zinc-300">
                      {row.annual_rate}%
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </section>
      ))}

      {visibleCount < rows.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + initialCount)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Show more
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
