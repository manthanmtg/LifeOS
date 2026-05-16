"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "../lib/emi-utils";
import { ScheduleResult } from "../types";

interface ScheduleTableProps {
  schedule: ScheduleResult;
  currencySymbol: string;
  decimals: number;
  numberFormat: "western" | "indian";
  onExportCSV: () => void;
  onPrintPDF: () => void;
}

export default function ScheduleTable({
  schedule,
  currencySymbol,
  decimals,
  numberFormat,
  onExportCSV,
  onPrintPDF,
}: ScheduleTableProps) {
  const [todayMs] = useState(() => Date.now());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-zinc-300">
          Amortization Schedule
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/70 px-3 py-1.5 text-xs font-bold text-zinc-400 shadow-sm shadow-zinc-950/30 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={onPrintPDF}
            className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/70 px-3 py-1.5 text-xs font-bold text-zinc-400 shadow-sm shadow-zinc-950/30 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/60 to-zinc-950/20 shadow-xl shadow-zinc-950/30 ring-1 ring-zinc-800/50">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 font-black uppercase tracking-widest">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3 text-right">Principal</th>
              <th className="px-4 py-3 text-right">Interest</th>
              <th className="px-4 py-3 text-right">Extra</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {schedule.rows.map((row) => {
              const isPaid = new Date(row.due_date).getTime() < todayMs;
              return (
                <tr
                  key={row.index}
                  className={cn(
                    "hover:bg-zinc-800/30 transition-colors group",
                    isPaid ? "bg-zinc-950/35 opacity-60" : "opacity-100",
                    row.index % 2 === 0 ? "bg-zinc-900/10" : "bg-transparent",
                  )}
                >
                  <td className="px-4 py-2.5 text-center text-zinc-600 font-mono group-hover:text-zinc-400">
                    {row.index}
                  </td>
                  <td className="px-4 py-2.5">
                    {isPaid ? (
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-black uppercase tracking-tighter">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[9px] font-black uppercase tracking-tighter">
                        Upcoming
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300 font-medium">
                    {row.due_date.slice(0, 10)}
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
              <td colSpan={3} className="px-4 py-3">
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
