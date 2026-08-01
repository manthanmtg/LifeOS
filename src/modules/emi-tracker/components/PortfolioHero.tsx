"use client";

import { CalendarClock, Landmark, WalletCards } from "lucide-react";
import { CURR_SYM, formatMoney } from "../lib/emi-utils";
import type { PortfolioViewModel } from "../lib/emi-view-model";
import { financialValueClass } from "./financial-value";

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
  const primaryTotal = primary
    ? formatMoney(
        primary.outstanding,
        symbolFor(primary.currency),
        decimals,
        numberFormat,
      )
    : formatMoney(0, symbolFor(defaultCurrency), decimals, numberFormat);
  const monthlyCommitment = primary
    ? formatMoney(
        primary.monthlyCommitment,
        symbolFor(primary.currency),
        decimals,
        numberFormat,
      )
    : formatMoney(0, symbolFor(defaultCurrency), decimals, numberFormat);
  const nextAmount = model.nearestDue
    ? formatMoney(
        model.nearestDue.amount,
        symbolFor(model.nearestDue.currency),
        decimals,
        numberFormat,
      )
    : "None due";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-4 md:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(180px,0.75fr)_minmax(180px,0.75fr)] lg:divide-x lg:divide-zinc-800">
        <div className="min-w-0 space-y-4 lg:pr-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Total outstanding
            </p>
            <h2
              data-financial-value="portfolio-total"
              aria-label={
                isMixed
                  ? `${model.currencies.length} currencies tracked`
                  : `Total outstanding ${primaryTotal}`
              }
              className={financialValueClass(
                isMixed
                  ? `${model.currencies.length} currencies tracked`
                  : primaryTotal,
                "hero",
              )}
            >
              {isMixed
                ? `${model.currencies.length} currencies tracked`
                : primaryTotal}
            </h2>
          </div>

          {isMixed ? (
            <div className="grid gap-2">
              {model.currencies.map((summary) => (
                <div
                  key={summary.currency}
                  className="grid gap-2 border-t border-zinc-800 pt-3 text-sm sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
                >
                  <span className="font-bold text-zinc-300">
                    {summary.currency}
                  </span>
                  <span
                    data-financial-value={`portfolio-${summary.currency}-outstanding`}
                    className={financialValueClass(
                      formatMoney(
                        summary.outstanding,
                        symbolFor(summary.currency),
                        decimals,
                        numberFormat,
                      ),
                      "minor",
                    )}
                  >
                    {formatMoney(
                      summary.outstanding,
                      symbolFor(summary.currency),
                      decimals,
                      numberFormat,
                    )}
                  </span>
                  <span className="text-zinc-500">
                    Monthly{" "}
                    <span
                      className={financialValueClass(
                        formatMoney(
                          summary.monthlyCommitment,
                          symbolFor(summary.currency),
                          decimals,
                          numberFormat,
                        ),
                        "minor",
                      )}
                    >
                      {formatMoney(
                        summary.monthlyCommitment,
                        symbolFor(summary.currency),
                        decimals,
                        numberFormat,
                      )}
                    </span>
                  </span>
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
                {Math.round(progress)}% of principal paid · {model.activeCount}{" "}
                active {model.activeCount === 1 ? "loan" : "loans"}
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2 lg:px-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <CalendarClock className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">
              Next EMI
            </p>
          </div>
          <p
            data-financial-value="portfolio-next-emi"
            className={financialValueClass(nextAmount, "major")}
          >
            {nextAmount}
          </p>
          <p className="text-sm text-zinc-400">
            {model.nearestDue
              ? `${model.nearestDue.loanTitle} · ${shortDate(model.nearestDue.dueDate)}`
              : "No upcoming active EMI"}
          </p>
        </div>

        <div className="min-w-0 space-y-2 lg:pl-5">
          <div className="flex items-center gap-2 text-zinc-500">
            <WalletCards className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">
              Monthly commitment
            </p>
          </div>
          <p
            data-financial-value="portfolio-monthly"
            className={financialValueClass(monthlyCommitment, "major")}
          >
            {monthlyCommitment}
          </p>
          <p className="text-sm text-zinc-400">
            {model.activeCount} active · {model.closedCount} closed ·{" "}
            {model.allCount} total
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Landmark className="h-4 w-4 text-zinc-500" />
            Portfolio records
          </div>
        </div>
      </div>
    </section>
  );
}
