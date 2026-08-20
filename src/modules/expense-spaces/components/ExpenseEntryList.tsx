"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ContentListSkeleton } from "@/components/ui/Skeletons";
import { useExpenseEntries } from "../hooks/useExpenseEntries";
import type {
  ExpenseEntryFilters,
  ExpenseSpaceDocument,
  ExpenseSpaceEntryDocument,
  ExpenseSpaceUpdateInput,
} from "../types";
import { EXPENSE_PAYMENT_METHODS, EXPENSE_SPACE_PAGE_SIZE } from "../constants";
import { expenseSpacesApi } from "../api";
import ExpenseEntryForm from "./ExpenseEntryForm";
import { formatExpenseMoney } from "./ExpenseSpacesOverview";

interface Props {
  space: ExpenseSpaceDocument;
  onSpaceUpdated: (space: ExpenseSpaceDocument) => void;
  onLedgerChanged: () => Promise<void>;
}

const DEFAULT_FILTERS: ExpenseEntryFilters = {
  page: 1,
  pageSize: EXPENSE_SPACE_PAGE_SIZE,
  sort: "date-desc",
};

export default function ExpenseEntryList({
  space,
  onSpaceUpdated,
  onLedgerChanged,
}: Props) {
  const [filters, setFilters] = useState<ExpenseEntryFilters>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseSpaceEntryDocument | null>(
    null,
  );
  const [duplicateSource, setDuplicateSource] =
    useState<ExpenseSpaceEntryDocument | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, loading, error, reload, create, update, remove } =
    useExpenseEntries(space._id, filters);

  const categoryMap = useMemo(
    () =>
      new Map(
        space.payload.categories.map((category) => [category.id, category]),
      ),
    [space.payload.categories],
  );
  const activeFilterCount = [
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.categoryId,
    filters.subcategoryId,
    filters.paidTo,
    filters.paymentMethod,
  ].filter(Boolean).length;
  const selectedFilterCategory = space.payload.categories.find(
    (category) => category.id === filters.categoryId,
  );

  const updateFilter = (patch: Partial<ExpenseEntryFilters>) => {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  };

  const categoryPath = (entry: ExpenseSpaceEntryDocument) => {
    const category = categoryMap.get(entry.payload.category_id);
    const subcategory = entry.payload.subcategory_id
      ? category?.subcategories.find(
          (candidate) => candidate.id === entry.payload.subcategory_id,
        )
      : undefined;
    return `${category?.name ?? "Unknown category"}${
      entry.payload.subcategory_id
        ? ` / ${subcategory?.name ?? "Unknown subcategory"}`
        : ""
    }`;
  };

  const deleteEntry = async (entry: ExpenseSpaceEntryDocument) => {
    if (!window.confirm("Delete this expense?")) return;
    setActionError(null);
    try {
      await remove(entry._id);
      await onLedgerChanged();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Unable to delete expense",
      );
    }
  };

  const duplicateEntry = (entry: ExpenseSpaceEntryDocument) => {
    setEditing(null);
    setDuplicateSource(entry);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-50">
              Expense ledger
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {data.total} {data.total === 1 ? "expense" : "expenses"} in this
              view
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            disabled={space.payload.status === "archived"}
            className="h-11"
          >
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Add expense
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,auto))]">
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
              updateFilter({ search: searchDraft.trim() || undefined });
            }}
          >
            <label className="sr-only" htmlFor="entry-search">
              Search expenses
            </label>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500"
            />
            <input
              id="entry-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search description, payee, reference, tags"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button type="submit" className="sr-only">
              Apply search
            </button>
          </form>
          <label>
            <span className="sr-only">Category filter</span>
            <select
              aria-label="Category filter"
              value={filters.categoryId ?? ""}
              onChange={(event) =>
                updateFilter({
                  categoryId: event.target.value || undefined,
                  subcategoryId: undefined,
                })
              }
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All categories</option>
              {space.payload.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Payment method filter</span>
            <select
              aria-label="Payment method filter"
              value={filters.paymentMethod ?? ""}
              onChange={(event) =>
                updateFilter({
                  paymentMethod:
                    (event.target
                      .value as ExpenseEntryFilters["paymentMethod"]) ||
                    undefined,
                })
              }
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">All payment methods</option>
              {EXPENSE_PAYMENT_METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort expenses</span>
            <select
              aria-label="Sort expenses"
              value={filters.sort}
              onChange={(event) =>
                updateFilter({
                  sort: event.target.value as ExpenseEntryFilters["sort"],
                })
              }
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="paid-to-asc">Paid to A–Z</option>
            </select>
          </label>
        </div>

        <details className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70">
            <Filter aria-hidden="true" className="h-4 w-4 text-accent" /> More
            filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                {activeFilterCount} active
              </span>
            )}
          </summary>
          <div className="grid gap-3 pb-2 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-zinc-500">
              From date
              <input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(event) =>
                  updateFilter({ dateFrom: event.target.value || undefined })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              To date
              <input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(event) =>
                  updateFilter({ dateTo: event.target.value || undefined })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Subcategory
              <select
                value={filters.subcategoryId ?? ""}
                disabled={!filters.categoryId}
                onChange={(event) =>
                  updateFilter({
                    subcategoryId: event.target.value || undefined,
                  })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50 disabled:opacity-50"
              >
                <option value="">All subcategories</option>
                {selectedFilterCategory?.subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Paid to
              <select
                value={filters.paidTo ?? ""}
                onChange={(event) =>
                  updateFilter({ paidTo: event.target.value || undefined })
                }
                className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-50"
              >
                <option value="">All payees</option>
                {data.facets.paid_to.map((payee) => (
                  <option key={payee}>{payee}</option>
                ))}
              </select>
            </label>
          </div>
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setSearchDraft("");
              }}
              className="mb-2 h-11"
            >
              <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" /> Reset
              filters
            </Button>
          )}
        </details>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-muted/20 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{actionError ?? error}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => void reload()}
            className="h-11"
          >
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div role="status" aria-label="Loading expense ledger" aria-busy="true">
          <ContentListSkeleton length={4} />
        </div>
      ) : data.entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/25 px-5 py-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-50">
            No expenses in this view
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            {activeFilterCount > 0
              ? "Reset filters or try a broader date range."
              : "Add the first expense to start building this space’s ledger and analytics."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Expense</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950/30">
                {data.entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-zinc-900/45">
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums text-zinc-400">
                      {entry.payload.date}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-100">
                        {entry.payload.description}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {entry.payload.paid_to}
                        {entry.payload.payment_method
                          ? ` · ${entry.payload.payment_method}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {categoryPath(entry)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-zinc-50">
                      {formatExpenseMoney(
                        entry.payload.amount,
                        entry.payload.currency,
                        space.payload.number_format,
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Duplicate ${entry.payload.description}`}
                          disabled={space.payload.status === "archived"}
                          onClick={() => duplicateEntry(entry)}
                          className="h-11 w-11"
                        >
                          <Copy aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${entry.payload.description}`}
                          disabled={space.payload.status === "archived"}
                          onClick={() => {
                            setEditing(entry);
                            setFormOpen(true);
                          }}
                          className="h-11 w-11"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${entry.payload.description}`}
                          disabled={space.payload.status === "archived"}
                          onClick={() => void deleteEntry(entry)}
                          className="h-11 w-11 text-danger hover:text-danger"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {data.entries.map((entry) => (
              <article
                key={entry._id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-50">
                      {entry.payload.description}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {entry.payload.paid_to}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold tabular-nums text-zinc-50">
                    {formatExpenseMoney(
                      entry.payload.amount,
                      entry.payload.currency,
                      space.payload.number_format,
                    )}
                  </p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-zinc-600">Date</dt>
                    <dd className="mt-1 text-zinc-300">{entry.payload.date}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Category</dt>
                    <dd className="mt-1 text-zinc-300">
                      {categoryPath(entry)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end gap-2 border-t border-zinc-800 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={space.payload.status === "archived"}
                    onClick={() => duplicateEntry(entry)}
                    className="h-11"
                  >
                    <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={space.payload.status === "archived"}
                    onClick={() => {
                      setEditing(entry);
                      setFormOpen(true);
                    }}
                    className="h-11"
                  >
                    <Pencil aria-hidden="true" className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={space.payload.status === "archived"}
                    onClick={() => void deleteEntry(entry)}
                    className="h-11 text-danger hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />{" "}
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {data.totalPages > 1 && (
        <nav
          aria-label="Expense pages"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
        >
          <Button
            type="button"
            variant="ghost"
            disabled={filters.page <= 1}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page - 1 }))
            }
            className="h-11"
          >
            <ChevronLeft aria-hidden="true" className="mr-2 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm tabular-nums text-zinc-500">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={filters.page >= data.totalPages}
            onClick={() =>
              setFilters((current) => ({ ...current, page: current.page + 1 }))
            }
            className="h-11"
          >
            Next <ChevronRight aria-hidden="true" className="ml-2 h-4 w-4" />
          </Button>
        </nav>
      )}

      <ExpenseEntryForm
        open={formOpen}
        space={space}
        entry={editing ?? duplicateSource}
        mode={editing ? "edit" : duplicateSource ? "duplicate" : "create"}
        payeeSuggestions={data.facets.paid_to}
        descriptionSuggestions={data.facets.descriptions}
        tagSuggestions={data.facets.tags}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setDuplicateSource(null);
        }}
        onSave={async (input) => {
          const result = editing
            ? await update(editing._id, input)
            : await create(input);
          await onLedgerChanged();
          return result;
        }}
        onSaveSpaceTaxonomy={async (input: ExpenseSpaceUpdateInput) => {
          const updated = await expenseSpacesApi.update(space._id, input);
          onSpaceUpdated(updated);
          return updated;
        }}
      />
    </div>
  );
}
