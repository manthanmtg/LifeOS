"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  ReceiptText,
  Sigma,
} from "lucide-react";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import { expenseSpacesApi } from "../api";
import type {
  ExpenseSpaceAnalyticsResponse,
  ExpenseSpaceDocument,
  ExpenseSpaceSummary,
} from "../types";
import { formatExpenseMoney } from "./ExpenseSpacesOverview";

const ExpenseSpaceCharts = dynamic(() => import("./ExpenseSpaceCharts"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Loading analytics charts"
      className="grid gap-4 xl:grid-cols-2"
    >
      <SkeletonBlock className="h-80 rounded-2xl" />
      <SkeletonBlock className="h-80 rounded-2xl" />
    </div>
  ),
});

interface Props {
  scope: "space" | "all";
  space?: ExpenseSpaceDocument;
  spaces: ExpenseSpaceSummary[];
  onOpenSpace?: (spaceId: string) => void;
}

function presetRange(preset: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  if (preset === "this-month") {
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  if (preset === "this-year") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return { from: undefined, to: undefined };
}

export default function ExpenseSpaceAnalytics({
  scope,
  space,
  spaces,
  onOpenSpace,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currencies = useMemo(
    () => [...new Set(spaces.map((item) => item.payload.currency))].sort(),
    [spaces],
  );
  const [currency, setCurrency] = useState(
    scope === "space"
      ? (space?.payload.currency ?? "USD")
      : (searchParams.get("currency") ?? currencies[0] ?? ""),
  );
  const [preset, setPreset] = useState(
    searchParams.get("preset") ?? "all-time",
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") ?? "");
  const [numberFormat, setNumberFormat] = useState<"western" | "indian">(
    scope === "space"
      ? (space?.payload.number_format ?? "western")
      : searchParams.get("number_format") === "indian"
        ? "indian"
        : "western",
  );
  const [analytics, setAnalytics] =
    useState<ExpenseSpaceAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedRange =
    preset === "custom"
      ? { from: dateFrom || undefined, to: dateTo || undefined }
      : presetRange(preset);

  useEffect(() => {
    if (!currency || (scope === "space" && !space)) {
      return;
    }
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const result = await expenseSpacesApi.analytics({
          scope,
          spaceId: space?._id,
          currency: scope === "all" ? currency : undefined,
          dateFrom: resolvedRange.from,
          dateTo: resolvedRange.to,
        });
        if (!controller.signal.aborted) setAnalytics(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load analytics",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => controller.abort();
  }, [currency, preset, dateFrom, dateTo, scope, space?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistState = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`/admin/expense-spaces?${params}`);
  };

  if (scope === "all" && currencies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/25 px-5 py-12 text-center">
        <BarChart3
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-zinc-500"
        />
        <h2 className="mt-4 text-xl font-semibold text-zinc-50">
          No spaces to analyze
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Create an expense space first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {scope === "all" && (
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Currency scope
              <select
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                  persistState({ currency: event.target.value });
                }}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base normal-case tracking-normal text-zinc-50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {currencies.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Date range
            <select
              value={preset}
              onChange={(event) => {
                setPreset(event.target.value);
                persistState({ preset: event.target.value });
              }}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base normal-case tracking-normal text-zinc-50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all-time">All time</option>
              <option value="this-month">This month</option>
              <option value="this-year">This year</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {scope === "all" && (
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Number format
              <select
                value={numberFormat}
                onChange={(event) => {
                  const value = event.target.value as "western" | "indian";
                  setNumberFormat(value);
                  persistState({ number_format: value });
                }}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base normal-case tracking-normal text-zinc-50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="western">Western</option>
                <option value="indian">Indian</option>
              </select>
            </label>
          )}
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    persistState({ date_from: event.target.value });
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-50"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    persistState({ date_to: event.target.value });
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-50"
                />
              </label>
            </div>
          )}
        </div>
        {scope === "all" && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-muted/15 p-3 text-xs leading-5 text-warning">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            LifeOS does not convert currencies. Every total and chart below is
            restricted to {currency}.
          </p>
        )}
      </div>

      {loading ? (
        <ExpenseSpaceAnalyticsLoadingSkeleton />
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger"
        >
          {error}
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Total spend",
                value: formatExpenseMoney(
                  analytics.totals.amount,
                  analytics.currency,
                  numberFormat,
                ),
                icon: Sigma,
              },
              {
                label: "Transactions",
                value: analytics.totals.count.toLocaleString(),
                icon: ReceiptText,
              },
              {
                label: "Average expense",
                value: formatExpenseMoney(
                  analytics.totals.average,
                  analytics.currency,
                  numberFormat,
                ),
                icon: BarChart3,
              },
              {
                label: "Months represented",
                value: analytics.by_month.length.toLocaleString(),
                icon: CalendarRange,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4"
              >
                <metric.icon
                  aria-hidden="true"
                  className="h-4 w-4 text-accent"
                />
                <p className="mt-4 break-words text-lg font-bold tabular-nums text-zinc-50 sm:text-xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {analytics.totals.count === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/25 px-5 py-12 text-center">
              <h3 className="text-lg font-semibold text-zinc-50">
                No expenses in this range
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                Try All time or choose a broader custom range.
              </p>
            </div>
          ) : (
            <ExpenseSpaceCharts analytics={analytics} />
          )}

          {analytics.by_space.length > 1 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
              <h3 className="font-semibold text-zinc-50">Spend by space</h3>
              <div className="mt-3 space-y-2">
                {analytics.by_space.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenSpace?.(item.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/45 px-3 py-2 text-left hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    <span className="font-medium text-zinc-200">
                      {item.name}
                    </span>
                    <span className="flex items-center gap-2 font-semibold tabular-nums text-zinc-50">
                      {formatExpenseMoney(
                        item.amount,
                        analytics.currency,
                        numberFormat,
                      )}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 text-accent"
                      />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <AccessibleBreakdownTable
              title="Category values"
              currency={analytics.currency}
              format={numberFormat}
              rows={analytics.by_category}
            />
            <AccessibleBreakdownTable
              title="Paid-to values"
              currency={analytics.currency}
              format={numberFormat}
              rows={analytics.by_paid_to}
            />
            <AccessibleBreakdownTable
              title="Category / subcategory values"
              currency={analytics.currency}
              format={numberFormat}
              rows={analytics.by_subcategory.map((item) => ({
                name: `${item.category} / ${item.subcategory}`,
                amount: item.amount,
                count: item.count,
              }))}
            />
            <AccessibleBreakdownTable
              title="Payment method values"
              currency={analytics.currency}
              format={numberFormat}
              rows={analytics.by_payment_method}
            />
          </div>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
            <h3 className="font-semibold text-zinc-50">Largest expenses</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-600">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Expense</th>
                    <th className="py-2 pr-3">Paid to</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {analytics.largest_expenses.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-3 tabular-nums text-zinc-500">
                        {item.date}
                      </td>
                      <td className="py-3 pr-3 text-zinc-200">
                        {item.description}
                      </td>
                      <td className="py-3 pr-3 text-zinc-400">
                        {item.paid_to}
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-zinc-50">
                        {formatExpenseMoney(
                          item.amount,
                          analytics.currency,
                          numberFormat,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ExpenseSpaceAnalyticsLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading expense analytics"
      aria-busy="true"
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4"
          >
            <SkeletonBlock className="h-4 w-4 rounded-md" />
            <SkeletonBlock className="mt-4 h-6 w-3/5" />
            <SkeletonBlock className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5"
          >
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="mt-5 h-52 rounded-xl" />
          </section>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5"
          >
            <SkeletonBlock className="h-5 w-40" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, rowIndex) => (
                <SkeletonBlock key={rowIndex} className="h-4 w-full" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AccessibleBreakdownTable({
  title,
  rows,
  currency,
  format,
}: {
  title: string;
  rows: Array<{ name: string; amount: number; count: number }>;
  currency: string;
  format: "western" | "indian";
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <h3 className="font-semibold text-zinc-50">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-600">
            <tr>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3 text-right">Count</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="py-2.5 pr-3 text-zinc-300">{row.name}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-500">
                  {row.count}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums text-zinc-100">
                  {formatExpenseMoney(row.amount, currency, format)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
