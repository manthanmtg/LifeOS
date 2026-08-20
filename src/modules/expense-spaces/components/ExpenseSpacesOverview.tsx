"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Plus,
  Search,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ExpenseSpaceSummary } from "../types";

interface Props {
  spaces: ExpenseSpaceSummary[];
  status: "active" | "archived" | "all";
  onStatusChange: (status: "active" | "archived" | "all") => void;
  onOpen: (spaceId: string) => void;
  onCreate: () => void;
  onOpenAnalytics: () => void;
}

export function formatExpenseMoney(
  amount: number,
  currency: string,
  format: "western" | "indian" = "western",
) {
  return new Intl.NumberFormat(format === "indian" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ExpenseSpacesOverview({
  spaces,
  status,
  onStatusChange,
  onOpen,
  onCreate,
  onOpenAnalytics,
}: Props) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-US");
    return spaces.filter((space) => {
      if (status !== "all" && space.payload.status !== status) return false;
      if (!query) return true;
      return `${space.payload.name} ${space.payload.description ?? ""}`
        .toLocaleLowerCase("en-US")
        .includes(query);
    });
  }, [search, spaces, status]);

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/55 p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
              <WalletCards aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Project finance
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-50 sm:text-4xl">
              Expense Spaces
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              Separate renovation, pet, estate, and other life-event spending
              without mixing budgets or currencies.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onOpenAnalytics}
              className="h-11"
              disabled={spaces.length === 0}
            >
              <BarChart3 aria-hidden="true" className="mr-2 h-4 w-4" /> All
              analytics
            </Button>
            <Button type="button" onClick={onCreate} className="h-11">
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> New expense
              space
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="relative block">
          <span className="sr-only">Search expense spaces</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search spaces"
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <label>
          <span className="sr-only">Space status</span>
          <select
            aria-label="Space status"
            value={status}
            onChange={(event) =>
              onStatusChange(
                event.target.value as "active" | "archived" | "all",
              )
            }
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="active">Active spaces</option>
            <option value="archived">Archived spaces</option>
            <option value="all">All spaces</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/30 px-5 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400">
            <WalletCards aria-hidden="true" className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-zinc-50">
            {spaces.length === 0
              ? "Create your first expense space"
              : "No spaces match this view"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Track House Renovation, Pet Expenses, Estate Expenses, or any
            project that deserves a clean ledger of its own.
          </p>
          {spaces.length === 0 && (
            <Button type="button" onClick={onCreate} className="mt-6 h-11">
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Create a
              space
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((space) => {
            const budget = space.payload.budget;
            const spendForBudget =
              budget?.cadence === "monthly"
                ? space.summary.this_month_spend
                : space.summary.total_spend;
            const progress = budget
              ? Math.min(100, (spendForBudget / budget.amount) * 100)
              : 0;
            return (
              <button
                key={space._id}
                type="button"
                aria-label={`Open ${space.payload.name}`}
                onClick={() => onOpen(space._id)}
                className="group min-h-[220px] rounded-2xl border border-zinc-800 bg-zinc-900/55 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-50">
                        {space.payload.name}
                      </h2>
                      {space.payload.status === "archived" && (
                        <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning-muted/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-warning">
                          <Archive
                            aria-hidden="true"
                            className="mr-1 h-3 w-3"
                          />{" "}
                          Archived
                        </span>
                      )}
                    </div>
                    {space.payload.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                        {space.payload.description}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-accent"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Total spend
                    </p>
                    <p className="mt-1 truncate text-lg font-bold tabular-nums text-zinc-50">
                      {formatExpenseMoney(
                        space.summary.total_spend,
                        space.payload.currency,
                        space.payload.number_format,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Activity
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-200">
                      {space.summary.entry_count}{" "}
                      {space.summary.entry_count === 1 ? "expense" : "expenses"}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <CalendarDays
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                      {space.summary.last_entry_date ?? "No entries yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-zinc-800 pt-4">
                  {budget ? (
                    <>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-500">
                          {budget.cadence === "monthly" ? "Monthly" : "Total"}{" "}
                          budget
                        </span>
                        <span className="font-semibold tabular-nums text-zinc-300">
                          {Math.round((spendForBudget / budget.amount) * 100)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            progress >= 100
                              ? "bg-danger"
                              : progress >= 75
                                ? "bg-warning"
                                : "bg-success",
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-600">
                      No budget configured
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
