"use client";

import {
  ArrowLeft,
  Archive,
  BarChart3,
  ListChecks,
  Settings2,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type {
  ExpenseSpaceDetail,
  ExpenseSpaceDocument,
  ExpenseSpaceSummary,
  ExpenseSpaceTab,
  ExpenseSpaceUpdateInput,
} from "../types";
import ExpenseEntryList from "./ExpenseEntryList";
import ExpenseSpaceAnalytics from "./ExpenseSpaceAnalytics";
import ExpenseSpaceSettings from "./ExpenseSpaceSettings";
import { formatExpenseMoney } from "./ExpenseSpacesOverview";

interface Props {
  space: ExpenseSpaceDetail;
  summary?: ExpenseSpaceSummary;
  spaces: ExpenseSpaceSummary[];
  tab: ExpenseSpaceTab;
  onBack: () => void;
  onTabChange: (tab: ExpenseSpaceTab) => void;
  onSpaceUpdated: (space: ExpenseSpaceDocument) => void;
  onUpdate: (input: ExpenseSpaceUpdateInput) => Promise<ExpenseSpaceDocument>;
  onDelete: (confirmation: string) => Promise<void>;
  onReload: () => Promise<void>;
}

const TABS = [
  { id: "expenses" as const, label: "Expenses", icon: ListChecks },
  { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  { id: "settings" as const, label: "Settings", icon: Settings2 },
];

export default function ExpenseSpaceWorkspace({
  space,
  summary,
  spaces,
  tab,
  onBack,
  onTabChange,
  onSpaceUpdated,
  onUpdate,
  onDelete,
  onReload,
}: Props) {
  const totalSpend = summary?.summary.total_spend ?? 0;
  const thisMonthSpend = summary?.summary.this_month_spend ?? 0;
  const budget = space.payload.budget;
  const budgetSpend =
    budget?.cadence === "monthly" ? thisMonthSpend : totalSpend;
  const budgetPercent = budget ? (budgetSpend / budget.amount) * 100 : null;

  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="h-11 px-2"
      >
        <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" /> Back to
        expense spaces
      </Button>

      <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/55 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
            <WalletCards aria-hidden="true" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-zinc-50 sm:text-3xl">
                {space.payload.name}
              </h1>
              {space.payload.status === "archived" && (
                <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning-muted/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warning">
                  <Archive aria-hidden="true" className="mr-1 h-3 w-3" />{" "}
                  Archived
                </span>
              )}
            </div>
            {space.payload.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                {space.payload.description}
              </p>
            )}
          </div>
        </div>

        <dl className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryMetric
            label="Lifetime spend"
            value={formatExpenseMoney(
              totalSpend,
              space.payload.currency,
              space.payload.number_format,
            )}
          />
          <SummaryMetric
            label="Expenses"
            value={space.entry_count.toLocaleString()}
          />
          <SummaryMetric
            label={budget ? `${budget.cadence} budget used` : "Budget"}
            value={
              budgetPercent === null
                ? "Not set"
                : `${Math.round(budgetPercent)}%`
            }
            state={
              budgetPercent === null
                ? undefined
                : budgetPercent > 100
                  ? "danger"
                  : budgetPercent > 75
                    ? "warning"
                    : "success"
            }
          />
          <SummaryMetric
            label="Taxonomy"
            value={`${space.payload.categories.length} categories`}
          />
        </dl>
      </header>

      {space.payload.status === "archived" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-muted/15 p-4 text-sm leading-6 text-warning"
        >
          <Archive aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          This archived space is read-only. Restore it in Settings before
          adding, editing, or deleting expenses.
        </div>
      )}

      <div className="overflow-x-auto">
        <div
          role="tablist"
          aria-label="Expense space sections"
          className="inline-flex min-w-full gap-1 rounded-xl border border-zinc-800 bg-zinc-900/55 p-1 sm:min-w-0"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 sm:flex-none",
                tab === item.id
                  ? "bg-zinc-800 text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
              )}
            >
              <item.icon aria-hidden="true" className="h-4 w-4" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {tab === "expenses" && (
          <ExpenseEntryList
            space={space}
            onSpaceUpdated={onSpaceUpdated}
            onLedgerChanged={onReload}
          />
        )}
        {tab === "analytics" && (
          <ExpenseSpaceAnalytics scope="space" space={space} spaces={spaces} />
        )}
        {tab === "settings" && (
          <ExpenseSpaceSettings
            space={space}
            entryCount={space.entry_count}
            usedCategoryIds={space.used_category_ids ?? []}
            usedSubcategoryIds={space.used_subcategory_ids ?? []}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onReload={onReload}
          />
        )}
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-2 text-base font-bold leading-tight tabular-nums text-zinc-50 sm:text-lg",
          state === "success" && "text-success",
          state === "warning" && "text-warning",
          state === "danger" && "text-danger",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
