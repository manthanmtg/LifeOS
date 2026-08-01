"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "../lib/emi-utils";
import { ScheduleResult } from "../types";
import ScheduleCards from "./ScheduleCards";

interface ScheduleTableProps {
  schedule: ScheduleResult;
  currencySymbol: string;
  decimals: number;
  numberFormat: "western" | "indian";
  onExportCSV: () => void;
  onPrintPDF: () => void;
}

const PRESSABLE =
  "transition-all duration-200 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

export default function ScheduleTable({
  schedule,
  currencySymbol,
  decimals,
  numberFormat,
  onExportCSV,
  onPrintPDF,
}: ScheduleTableProps) {
  const [now] = useState(() => new Date());
  const todayMs = now.getTime();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-zinc-100">
            Amortization schedule
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {schedule.rows.length} payments ·{" "}
            {schedule.rows[0]?.due_date.slice(0, 10) ?? "—"} to{" "}
            {schedule.rows.at(-1)?.due_date.slice(0, 10) ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className={cn(
              "flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/70 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              PRESSABLE,
            )}
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            type="button"
            onClick={onPrintPDF}
            className={cn(
              "flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/70 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              PRESSABLE,
            )}
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <ScheduleCards
        rows={schedule.rows}
        currencySymbol={currencySymbol}
        decimals={decimals}
        numberFormat={numberFormat}
        now={now}
      />

      <div className="hidden overflow-x-auto rounded-lg border border-zinc-800/60 bg-zinc-900/60 ring-1 ring-zinc-800/50 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 font-black uppercase tracking-widest">
              <th className="px-4 py-3 text-center">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3 text-right">EMI</th>
              <th className="px-4 py-3 text-right">Principal</th>
              <th className="px-4 py-3 text-right">Interest</th>
              <th className="px-4 py-3 text-right">Extra</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {schedule.rows.map((row) => {
              const isPaid = new Date(row.due_date).getTime() < todayMs;
              const isNext =
                !isPaid &&
                schedule.rows
                  .filter(
                    (candidate) =>
                      new Date(candidate.due_date).getTime() >= todayMs,
                  )
                  .at(0)?.index === row.index;
              return (
                <tr
                  key={row.index}
                  aria-label={isNext ? `Next payment ${row.index}` : undefined}
                  className={cn(
                    "hover:bg-zinc-800/30 transition-colors group",
                    isPaid ? "bg-zinc-950/35" : "opacity-100",
                    isNext && "bg-warning/10",
                    row.index % 2 === 0 ? "bg-zinc-900/10" : "bg-transparent",
                  )}
                >
                  <td className="px-4 py-2.5 text-center text-zinc-600 font-mono group-hover:text-zinc-400">
                    {row.index}
                  </td>
                  <td className="px-4 py-2.5">
                    {isPaid ? (
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-black uppercase tracking-tighter">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-black">
                        {isNext ? "Next" : "Upcoming"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300 font-medium">
                    {row.due_date.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">
                    {formatMoney(
                      row.emi,
                      currencySymbol,
                      decimals,
                      numberFormat,
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-300 tabular-nums">
                    {formatMoney(
                      row.principal,
                      currencySymbol,
                      decimals,
                      numberFormat,
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-danger/80 tabular-nums font-medium">
                    {formatMoney(
                      row.interest,
                      currencySymbol,
                      decimals,
                      numberFormat,
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-accent tabular-nums font-bold">
                    {row.prepayment > 0
                      ? `+${formatMoney(row.prepayment, currencySymbol, decimals, numberFormat)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-100 font-bold tabular-nums">
                    {formatMoney(
                      row.closing_balance,
                      currencySymbol,
                      decimals,
                      numberFormat,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-zinc-900/50 border-t border-zinc-800">
            <tr className="font-black text-zinc-300 uppercase tracking-tighter">
              <td colSpan={4} className="px-4 py-3">
                Totals
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatMoney(
                  schedule.totals.total_principal,
                  currencySymbol,
                  decimals,
                  numberFormat,
                )}
              </td>
              <td className="px-4 py-3 text-right text-danger tabular-nums">
                {formatMoney(
                  schedule.totals.total_interest,
                  currencySymbol,
                  decimals,
                  numberFormat,
                )}
              </td>
              <td className="px-4 py-3 text-right text-accent tabular-nums">
                {formatMoney(
                  schedule.totals.total_prepayment,
                  currencySymbol,
                  decimals,
                  numberFormat,
                )}
              </td>
              <td className="px-4 py-3 text-right text-zinc-50 tabular-nums">
                {formatMoney(
                  schedule.totals.total_principal +
                    schedule.totals.total_interest,
                  currencySymbol,
                  decimals,
                  numberFormat,
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
