"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  CalendarClock,
  ChartPie,
  CircleDollarSign,
  Layers3,
  TimerReset,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, type NumberFormat } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  buildRecurringAnalytics,
  getActiveCurrencies,
  selectInitialAnalyticsCurrency,
  type RecurringAnalytics,
} from "../analytics";
import { getRecurringCurrencySymbol } from "../config";
import type { BillingCycle, RecurringExpense } from "../types";

const CHART_COLORS = [
  "var(--color-accent)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
  "var(--color-accent-hover)",
  "var(--color-success-muted)",
];

const CHART_INITIAL_DIMENSION = { width: 1, height: 1 };

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "summary",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface RecurringExpenseAnalyticsModalProps {
  isOpen: boolean;
  expenses: RecurringExpense[];
  defaultCurrency: string;
  numberFormat: NumberFormat;
  now: number;
  onClose: () => void;
}

function formatAmount(
  amount: number,
  currency: string,
  numberFormat: NumberFormat,
) {
  return formatCurrency(
    amount,
    getRecurringCurrencySymbol(currency),
    numberFormat,
  );
}

function formatPercent(share: number) {
  return `${Math.round(share * 100)}%`;
}

function numericTooltipValue(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function cycleLabel(cycle: BillingCycle) {
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hasAttribute("disabled"));
}

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="break-words text-2xl font-semibold tabular-nums text-zinc-50">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{detail}</p>
    </div>
  );
}

function DataDetails({
  children,
  label = "View data table",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <summary className="cursor-pointer text-xs font-medium text-zinc-400">
        {label}
      </summary>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full min-w-[420px] text-left text-xs">
      <thead className="text-zinc-500">
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col" className="px-2 py-1 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-zinc-300">
        {rows.map((row) => (
          <tr key={row.join("|")} className="border-t border-zinc-800">
            {row.map((cell, index) => (
              <td key={`${row[0]}-${index}`} className="px-2 py-1.5">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartPanel({
  title,
  subtitle,
  ariaLabel,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-50">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-8 text-center text-sm text-zinc-400">
      <ChartPie className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
      {children}
    </div>
  );
}

function CategoryAllocation({
  analytics,
  numberFormat,
}: {
  analytics: RecurringAnalytics;
  numberFormat: NumberFormat;
}) {
  const total = formatAmount(
    analytics.monthlyBurn,
    analytics.currency,
    numberFormat,
  );

  return (
    <ChartPanel
      title="Category allocation"
      subtitle={`Top categories by monthly equivalent. Total ${total}.`}
      ariaLabel="Category allocation"
      className="lg:col-span-2"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_minmax(220px,0.9fr)]">
        <div className="relative h-64 min-h-64 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            initialDimension={CHART_INITIAL_DIMENSION}
          >
            <PieChart>
              <Pie
                data={analytics.categories}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="84%"
                paddingAngle={2}
                isAnimationActive={false}
              >
                {analytics.categories.map((category, index) => (
                  <Cell
                    key={category.name}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value, _name, item) => {
                  const numericValue = numericTooltipValue(value);
                  const payload =
                    item.payload as RecurringAnalytics["categories"][number];
                  return [
                    `${formatAmount(numericValue, analytics.currency, numberFormat)} (${formatPercent(payload.share)})`,
                    payload.name,
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-zinc-500">Monthly</span>
            <span className="text-xl font-semibold tabular-nums text-zinc-50">
              {total}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {analytics.categories.map((category, index) => (
            <div
              key={category.name}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <span className="break-words text-sm font-medium text-zinc-100">
                    {category.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                  {formatPercent(category.share)}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {formatAmount(category.value, analytics.currency, numberFormat)}
                {" monthly"} · {category.count} item
                {category.count === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </div>
      <DataDetails>
        <DataTable
          headers={["Category", "Monthly", "Share", "Items"]}
          rows={analytics.categories.map((category) => [
            category.name,
            formatAmount(category.value, analytics.currency, numberFormat),
            formatPercent(category.share),
            String(category.count),
          ])}
        />
      </DataDetails>
    </ChartPanel>
  );
}

function BillingCadence({
  analytics,
  numberFormat,
}: {
  analytics: RecurringAnalytics;
  numberFormat: NumberFormat;
}) {
  const maxValue = Math.max(
    ...analytics.billingCycles.map((cycle) => cycle.value),
    0,
  );

  return (
    <ChartPanel
      title="Billing cadence"
      subtitle="Monthly impact grouped by billing cycle."
      ariaLabel="Billing cadence"
    >
      <div className="h-56 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={0}
          initialDimension={CHART_INITIAL_DIMENSION}
        >
          <BarChart data={analytics.billingCycles} layout="vertical">
            <CartesianGrid stroke="var(--color-zinc-800)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="cycle"
              type="category"
              width={86}
              tickFormatter={(value: BillingCycle) => cycleLabel(value)}
              tick={{ fill: "var(--color-zinc-400)", fontSize: 12 }}
            />
            <RechartsTooltip
              formatter={(value) =>
                formatAmount(
                  numericTooltipValue(value),
                  analytics.currency,
                  numberFormat,
                )
              }
              labelFormatter={(label) =>
                cycleLabel(String(label) as BillingCycle)
              }
            />
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              fill="var(--color-accent)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2">
        {analytics.billingCycles.map((cycle) => (
          <div key={cycle.cycle}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">{cycleLabel(cycle.cycle)}</span>
              <span className="tabular-nums text-zinc-300">
                {formatAmount(cycle.value, analytics.currency, numberFormat)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width:
                    maxValue > 0
                      ? `${Math.max(4, (cycle.value / maxValue) * 100)}%`
                      : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <DataDetails>
        <DataTable
          headers={["Cycle", "Monthly", "Items"]}
          rows={analytics.billingCycles.map((cycle) => [
            cycleLabel(cycle.cycle),
            formatAmount(cycle.value, analytics.currency, numberFormat),
            String(cycle.count),
          ])}
        />
      </DataDetails>
    </ChartPanel>
  );
}

function RenewalHorizon({
  analytics,
  numberFormat,
}: {
  analytics: RecurringAnalytics;
  numberFormat: NumberFormat;
}) {
  return (
    <ChartPanel
      title="Next renewal horizon"
      subtitle="Bars count active items; labels show raw next-charge amount."
      ariaLabel="Next renewal horizon"
    >
      <div className="h-56 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={0}
          initialDimension={CHART_INITIAL_DIMENSION}
        >
          <BarChart data={analytics.renewalHorizon}>
            <CartesianGrid stroke="var(--color-zinc-800)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-zinc-400)", fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--color-zinc-400)", fontSize: 12 }}
            />
            <RechartsTooltip
              formatter={(value, name, item) => {
                const numericValue = numericTooltipValue(value);
                const payload =
                  item.payload as RecurringAnalytics["renewalHorizon"][number];
                if (name === "count") {
                  return [
                    `${numericValue} item${numericValue === 1 ? "" : "s"} · ${formatAmount(payload.amount, analytics.currency, numberFormat)}`,
                    "Renewals",
                  ];
                }
                return [numericValue, String(name)];
              }}
            />
            <Bar
              dataKey="count"
              radius={[8, 8, 0, 0]}
              fill="var(--color-warning)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {analytics.renewalHorizon.map((bucket) => (
          <div
            key={bucket.key}
            className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2"
          >
            <p className="text-zinc-400">{bucket.label}</p>
            <p className="tabular-nums text-zinc-300">
              {bucket.count} ·{" "}
              {formatAmount(bucket.amount, analytics.currency, numberFormat)}
            </p>
          </div>
        ))}
      </div>
      <DataDetails>
        <DataTable
          headers={["Horizon", "Items", "Next charge"]}
          rows={analytics.renewalHorizon.map((bucket) => [
            bucket.label,
            String(bucket.count),
            formatAmount(bucket.amount, analytics.currency, numberFormat),
          ])}
        />
      </DataDetails>
    </ChartPanel>
  );
}

function CostDrivers({
  analytics,
  numberFormat,
}: {
  analytics: RecurringAnalytics;
  numberFormat: NumberFormat;
}) {
  const maxMonthly = Math.max(
    ...analytics.costDrivers.map((driver) => driver.monthlyEquivalent),
    0,
  );

  return (
    <ChartPanel
      title="Largest cost drivers"
      subtitle="Ranked by normalized monthly equivalent."
      ariaLabel="Largest cost drivers"
      className="lg:col-span-3"
    >
      <div className="space-y-3">
        {analytics.costDrivers.map((driver, index) => (
          <div
            key={driver.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-50">
                  <span className="mr-2 text-zinc-500">#{index + 1}</span>
                  <span className="break-words">{driver.name}</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {driver.category} · {cycleLabel(driver.cycle)} ·{" "}
                  {formatAmount(
                    driver.originalCost,
                    analytics.currency,
                    numberFormat,
                  )}
                  {" original"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums text-zinc-100">
                {formatAmount(
                  driver.monthlyEquivalent,
                  analytics.currency,
                  numberFormat,
                )}
                <span className="text-xs font-normal text-zinc-500"> /mo</span>
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-success"
                style={{
                  width:
                    maxMonthly > 0
                      ? `${Math.max(4, (driver.monthlyEquivalent / maxMonthly) * 100)}%`
                      : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <DataDetails>
        <DataTable
          headers={["Expense", "Category", "Cycle", "Original", "Monthly"]}
          rows={analytics.costDrivers.map((driver) => [
            driver.name,
            driver.category,
            cycleLabel(driver.cycle),
            formatAmount(driver.originalCost, analytics.currency, numberFormat),
            formatAmount(
              driver.monthlyEquivalent,
              analytics.currency,
              numberFormat,
            ),
          ])}
        />
      </DataDetails>
    </ChartPanel>
  );
}

export default function RecurringExpenseAnalyticsModal({
  isOpen,
  expenses,
  defaultCurrency,
  numberFormat,
  now,
  onClose,
}: RecurringExpenseAnalyticsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [manualCurrency, setManualCurrency] = useState<string | null>(null);

  const activeCurrencies = useMemo(
    () => getActiveCurrencies(expenses),
    [expenses],
  );
  const initialCurrency = useMemo(
    () => selectInitialAnalyticsCurrency(expenses, defaultCurrency),
    [defaultCurrency, expenses],
  );
  const selectedCurrency =
    manualCurrency && activeCurrencies.includes(manualCurrency)
      ? manualCurrency
      : initialCurrency;
  const hasActiveExpenses = activeCurrencies.length > 0;
  const hasMultipleCurrencies = activeCurrencies.length > 1;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const analytics = useMemo(
    () =>
      buildRecurringAnalytics(expenses, {
        currency: selectedCurrency,
        now,
      }),
    [expenses, now, selectedCurrency],
  );

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end bg-zinc-950/70 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          data-testid="recurring-analytics-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.01 : 0.16,
            ease: "easeOut",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-analytics-title"
            aria-describedby="recurring-analytics-description"
            tabIndex={-1}
            className="flex h-[100dvh] w-full flex-col overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl outline-none sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-3xl"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.98 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 8, scale: 0.99 }
            }
            transition={{
              duration: shouldReduceMotion ? 0.01 : 0.22,
              ease: "easeOut",
            }}
            onKeyDown={handleDialogKeyDown}
          >
            <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
                    <ChartPie className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id="recurring-analytics-title"
                      className="text-xl font-semibold text-zinc-50"
                    >
                      Recurring Expense Analytics
                    </h2>
                    <p
                      id="recurring-analytics-description"
                      className="mt-1 text-sm leading-6 text-zinc-400"
                    >
                      Active commitments, normalized monthly and scoped by
                      currency.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs text-success">
                        Active only
                      </span>
                      {!hasMultipleCurrencies && hasActiveExpenses && (
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                          {selectedCurrency} only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:shrink-0">
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label="Close analytics"
                    onClick={onClose}
                    className="order-last inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/45"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {hasMultipleCurrencies && (
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Currency</span>
                      <select
                        aria-label="Currency scope"
                        value={selectedCurrency}
                        onChange={(event) =>
                          setManualCurrency(event.target.value)
                        }
                        className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:ring-2 focus:ring-accent/45"
                      >
                        {activeCurrencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {hasMultipleCurrencies && (
                <p className="mt-3 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
                  Values are shown one currency at a time. LifeOS does not apply
                  exchange rates.
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
              {!hasActiveExpenses ? (
                <EmptyState>
                  No active recurring expenses to analyze.
                </EmptyState>
              ) : analytics.activeCount === 0 ? (
                <EmptyState>
                  No active expenses use {selectedCurrency}. Choose another
                  currency to view its analytics.
                </EmptyState>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InsightCard
                      icon={CircleDollarSign}
                      label="Committed monthly"
                      value={formatAmount(
                        analytics.monthlyBurn,
                        analytics.currency,
                        numberFormat,
                      )}
                      detail={`${analytics.activeCount} active item${analytics.activeCount === 1 ? "" : "s"} in ${analytics.currency}`}
                    />
                    <InsightCard
                      icon={Layers3}
                      label="Dominant category"
                      value={analytics.dominantCategory?.name ?? "-"}
                      detail={
                        analytics.dominantCategory
                          ? `${formatPercent(analytics.dominantCategory.share)} of monthly burn`
                          : "No category spend yet"
                      }
                    />
                    <InsightCard
                      icon={Activity}
                      label="Largest cost driver"
                      value={analytics.largestDriver?.name ?? "-"}
                      detail={
                        analytics.largestDriver
                          ? `${formatAmount(analytics.largestDriver.monthlyEquivalent, analytics.currency, numberFormat)} monthly equivalent`
                          : "No active driver yet"
                      }
                    />
                    <InsightCard
                      icon={TimerReset}
                      label="Next-renewal pressure"
                      value={formatAmount(
                        analytics.dueWithin30Days.amount,
                        analytics.currency,
                        numberFormat,
                      )}
                      detail={`${analytics.dueWithin30Days.count} due in 30 days · ${analytics.dueWithin30Days.overdueCount} overdue`}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <CategoryAllocation
                      analytics={analytics}
                      numberFormat={numberFormat}
                    />
                    <BillingCadence
                      analytics={analytics}
                      numberFormat={numberFormat}
                    />
                    <RenewalHorizon
                      analytics={analytics}
                      numberFormat={numberFormat}
                    />
                    <CostDrivers
                      analytics={analytics}
                      numberFormat={numberFormat}
                    />
                  </div>

                  <p className="flex items-center gap-2 text-xs leading-5 text-zinc-500">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Renewal horizon uses the next scheduled charge for each
                    active item.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
