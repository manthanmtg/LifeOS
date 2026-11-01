"use client";

import { useEffect, useState } from "react";
import { FileDown, ReceiptText, WalletCards } from "lucide-react";
import type {
  ExpenseSpaceBudget,
  ExpenseSpaceCategory,
  ExpenseSpaceNumberFormat,
} from "../types";
import { formatExpenseMoney } from "./ExpenseSpacesOverview";

type Entry = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  paid_to: string;
  category_id: string;
  subcategory_id?: string;
  date: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
  tags: string[];
  receipt_url?: string;
  receipts: { filename: string; index: number }[];
};
type Data = {
  space: {
    name: string;
    description?: string;
    currency: string;
    number_format: ExpenseSpaceNumberFormat;
    budget?: ExpenseSpaceBudget;
    categories: ExpenseSpaceCategory[];
  };
  summary: { total: number; month: number; count: number };
  entries: Entry[];
  total: number;
  page: number;
  documents: { id: string; filename: string; size: number }[];
  documentTotal: number;
  docsPage: number;
};

export default function SharedExpenseSpace({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [docsPage, setDocsPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      docsPage: String(docsPage),
      search: query,
      category: categoryFilter,
    });
    fetch(`/api/shared/expense-space/${encodeURIComponent(token)}?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "This share is unavailable. It may have been paused or deleted."
              : "Unable to load this share. Please try again.",
          );
        return response.json();
      })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((cause) => {
        if (cause.name !== "AbortError") {
          setData(null);
          setError(cause.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, page, docsPage, query, categoryFilter]);
  if (loading)
    return (
      <main
        role="status"
        aria-label="Loading shared expense space"
        className="mx-auto max-w-6xl animate-pulse space-y-5 p-6"
      >
        <div className="h-40 rounded-3xl bg-zinc-800" />
        <div className="h-32 rounded-3xl bg-zinc-800" />
        <div className="h-72 rounded-3xl bg-zinc-800" />
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-3xl font-bold text-zinc-50">Share unavailable</h1>
        <p role="alert" className="mt-4 text-zinc-400">
          {error}
        </p>
      </main>
    );
  const { space, summary } = data;
  const money = (amount: number, currency = space.currency) =>
    formatExpenseMoney(amount, currency, space.number_format);
  const category = (entry: Entry) => {
    const c = space.categories.find((item) => item.id === entry.category_id);
    const sub = c?.subcategories.find(
      (item) => item.id === entry.subcategory_id,
    );
    return [c?.name, sub?.name].filter(Boolean).join(" / ") || "Uncategorized";
  };
  const attachment = (kind: string, id: string, index?: number) =>
    `/api/shared/expense-space/${encodeURIComponent(token)}/attachment/${kind}/${encodeURIComponent(id)}${index === undefined ? "" : `?index=${index}`}`;
  const budgetSpend =
    space.budget?.cadence === "monthly" ? summary.month : summary.total;
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-10">
          <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
              <WalletCards className="h-4 w-4" /> Shared expense space
            </p>
            <h1 className="mt-5 break-words text-3xl font-black tracking-tight sm:text-5xl">
              {space.name}
            </h1>
            {space.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                {space.description}
              </p>
            )}
            <p className="mt-5 text-xs text-zinc-400">
              Read-only · reflects the latest changes when refreshed
            </p>
          </div>
        </header>
        <section
          aria-label="Budget overview"
          className="grid gap-3 sm:grid-cols-3"
        >
          <Metric
            label="Total spent"
            value={money(summary.total)}
            detail={`${summary.count} expenses`}
          />
          <Metric
            label={
              space.budget?.cadence === "monthly" ? "Monthly budget" : "Budget"
            }
            value={space.budget ? money(space.budget.amount) : "Not set"}
            detail={
              space.budget
                ? `${money(budgetSpend)} used${space.budget.cadence === "monthly" ? " this month" : ""}`
                : "No budget has been set"
            }
          />
          <Metric
            label="Remaining"
            value={
              space.budget ? money(space.budget.amount - budgetSpend) : "—"
            }
            detail={
              space.budget
                ? `${space.budget.cadence === "monthly" ? "Monthly" : "Total"} budget`
                : ""
            }
          />
        </section>
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                The ledger
              </p>
              <h2 className="mt-2 text-2xl font-bold">Expenses</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {data.total} {data.total === 1 ? "expense" : "expenses"}
                {query ? " found" : ""}
              </p>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setQuery(search.trim());
              }}
            >
              <label className="sr-only" htmlFor="expense-search">
                Search expenses
              </label>
              <input
                id="expense-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search expenses"
                maxLength={100}
                className="min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-zinc-950">
                Search
              </button>
            </form>
          </div>
          <label className="mt-4 block text-sm text-zinc-400">
            Category
            <select
              value={categoryFilter}
              onChange={(event) => {
                setPage(1);
                setCategoryFilter(event.target.value);
              }}
              className="ml-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            >
              <option value="">All categories</option>
              {space.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          {data.entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              {query || categoryFilter
                ? "No expenses match your filters."
                : "No expenses have been added yet."}
            </p>
          ) : (
            <>
              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="py-3 pr-4">Expense</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data.entries.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="max-w-sm py-4 pr-4">
                          <div className="break-words font-semibold text-zinc-50">
                            {entry.description}
                          </div>
                          <div className="mt-1 text-zinc-400">
                            {entry.paid_to}
                          </div>
                          {entry.payment_method && (
                            <div className="mt-1 text-xs text-zinc-400">
                              Payment: {entry.payment_method}
                            </div>
                          )}
                          {entry.reference && (
                            <div className="mt-1 break-words text-xs text-zinc-400">
                              Reference: {entry.reference}
                            </div>
                          )}
                          {entry.tags?.length > 0 && (
                            <div className="mt-1 text-xs text-zinc-400">
                              Tags: {entry.tags.join(", ")}
                            </div>
                          )}
                          {entry.notes && (
                            <div className="mt-2 whitespace-pre-wrap break-words text-zinc-300">
                              {entry.notes}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3">
                            {entry.receipts.map((receipt) => (
                              <a
                                key={receipt.index}
                                href={attachment(
                                  "receipt",
                                  entry.id,
                                  receipt.index,
                                )}
                                className="break-all text-accent underline underline-offset-4"
                              >
                                {receipt.filename}
                              </a>
                            ))}
                            {entry.receipt_url &&
                              /^https?:\/\//i.test(entry.receipt_url) && (
                                <a
                                  href={entry.receipt_url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-accent underline underline-offset-4"
                                >
                                  Receipt link
                                </a>
                              )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-4 pr-4 text-zinc-300">
                          {entry.date}
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">
                          {category(entry)}
                        </td>
                        <td className="whitespace-nowrap py-4 text-right font-bold tabular-nums">
                          {money(entry.amount, entry.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 space-y-3 md:hidden">
                {data.entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-zinc-50">
                          {entry.description}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {entry.paid_to} · {entry.date} · {category(entry)}
                        </p>
                      </div>
                      <p className="text-lg font-bold tabular-nums">
                        {money(entry.amount, entry.currency)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                      {entry.payment_method && (
                        <span>Payment: {entry.payment_method}</span>
                      )}
                      {entry.reference && (
                        <span>Reference: {entry.reference}</span>
                      )}
                      {entry.tags?.length > 0 && (
                        <span>Tags: {entry.tags.join(", ")}</span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-300">
                        {entry.notes}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3">
                      {entry.receipts.map((receipt) => (
                        <a
                          key={receipt.index}
                          href={attachment("receipt", entry.id, receipt.index)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-sm text-accent underline underline-offset-4"
                        >
                          <ReceiptText className="mr-1 inline h-4 w-4" />
                          {receipt.filename}
                        </a>
                      ))}
                      {entry.receipt_url &&
                        /^https?:\/\//i.test(entry.receipt_url) && (
                          <a
                            href={entry.receipt_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-sm text-accent underline underline-offset-4"
                          >
                            Receipt link
                          </a>
                        )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          <Pagination
            page={data.page}
            total={data.total}
            onChange={setPage}
            label="Expense"
          />
        </section>
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            Attachments
          </p>
          <h2 className="mt-2 text-2xl font-bold">Documents</h2>
          {data.documents.length === 0 ? (
            <p className="mt-5 text-sm text-zinc-400">
              No documents have been added yet.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-zinc-800">
              {data.documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={attachment("document", doc.id)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-4 py-4 text-sm text-zinc-100 hover:text-accent"
                  >
                    <span className="min-w-0 break-all">
                      <FileDown className="mr-2 inline h-4 w-4" />
                      {doc.filename}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {Math.max(1, Math.ceil(doc.size / 1024))} KB
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={data.docsPage}
            total={data.documentTotal}
            onChange={setDocsPage}
            label="Document"
          />
        </section>
      </div>
    </main>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-bold tabular-nums text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}
function Pagination({
  page,
  total,
  onChange,
  label,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  label: string;
}) {
  const pages = Math.ceil(total / 25);
  if (pages <= 1 && page <= 1) return null;
  return (
    <nav
      aria-label={`${label} pages`}
      className="mt-5 flex items-center justify-between gap-3 text-sm"
    >
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-zinc-700 px-3 py-2 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-zinc-400">
        Page {page} of {Math.max(pages, 1)}
      </span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-zinc-700 px-3 py-2 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
