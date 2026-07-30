"use client";

import { CalendarClock, Landmark, PiggyBank, WalletCards } from "lucide-react";
import { CURR_SYM, formatMoney } from "../lib/emi-utils";
import type { PortfolioViewModel } from "../lib/emi-view-model";

interface PortfolioHeroProps {
  model: PortfolioViewModel;
  defaultCurrency: string;
  decimals: number;
  numberFormat: "western" | "indian";
}

function symbolFor(currency: string) {
  return CURR_SYM[currency] || `${currency} `;
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export default function PortfolioHero({
  model,
  defaultCurrency,
  decimals,
  numberFormat,
}: PortfolioHeroProps) {
  const isMixed = model.currencies.length > 1;
  const primary =
    model.currencies.find((item) => item.currency === defaultCurrency) ??
    model.currencies[0];
  const progress =
    primary && primary.originalPrincipal > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (primary.principalPaid / primary.originalPrincipal) * 100,
          ),
        )
      : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl shadow-zinc-950/20 md:p-7">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-6 right-8 h-24 w-24 rounded-full bg-success/10 blur-3xl" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Total outstanding
            </p>
            <h2 className="mt-2 break-words font-mono text-4xl font-black tracking-tight text-zinc-50 md:text-5xl">
              {isMixed
                ? `${model.currencies.length} currencies tracked`
                : primary
                  ? formatMoney(
                      primary.outstanding,
                      symbolFor(primary.currency),
                      decimals,
                      numberFormat,
                    )
                  : formatMoney(
                      0,
                      symbolFor(defaultCurrency),
                      decimals,
                      numberFormat,
                    )}
            </h2>
          </div>

          {isMixed ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {model.currencies.map((summary) => (
                <div
                  key={summary.currency}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-zinc-300">
                      {summary.currency}
                    </span>
                    <span className="font-mono text-sm font-black text-zinc-50">
                      {formatMoney(
                        summary.outstanding,
                        symbolFor(summary.currency),
                        decimals,
                        numberFormat,
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Monthly commitment{" "}
                    {formatMoney(
                      summary.monthlyCommitment,
                      symbolFor(summary.currency),
                      decimals,
                      numberFormat,
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div
                className="h-3 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/70"
                role="progressbar"
                aria-label="Portfolio principal paid"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-zinc-500">
                {Math.round(progress)}% of principal paid
              </p>
            </div>
          )}
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4">
            <div className="flex items-center gap-2 text-warning">
              <CalendarClock className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">
                Next EMI
              </p>
            </div>
            <p className="mt-3 font-mono text-lg font-black text-zinc-50">
              {model.nearestDue
                ? formatMoney(
                    model.nearestDue.amount,
                    symbolFor(model.nearestDue.currency),
                    decimals,
                    numberFormat,
                  )
                : "None due"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {model.nearestDue
                ? `${model.nearestDue.loanTitle} · ${shortDate(model.nearestDue.dueDate)}`
                : "No upcoming active EMI"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4">
              <WalletCards className="mb-2 h-4 w-4 text-accent" />
              <p className="text-xs text-zinc-500">Active loans</p>
              <p className="font-mono text-lg font-black text-zinc-50">
                {model.activeCount}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4">
              <PiggyBank className="mb-2 h-4 w-4 text-success" />
              <p className="text-xs text-zinc-500">Interest saved</p>
              <p className="font-mono text-lg font-black text-zinc-50">
                {formatMoney(
                  model.totalInterestSaved,
                  symbolFor(defaultCurrency),
                  decimals,
                  numberFormat,
                )}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4 text-xs text-zinc-500 sm:flex xl:hidden">
            <Landmark className="h-4 w-4 text-zinc-400" />
            {model.closedCount} closed · {model.allCount} total
          </div>
        </div>
      </div>
    </section>
  );
}
