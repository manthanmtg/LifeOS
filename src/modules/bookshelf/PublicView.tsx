"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Library, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type BookStatus,
  type Book,
} from "./components/types";
import BookCard from "./components/BookCard";

const STATUS_ORDER: BookStatus[] = [
  "reading",
  "want_to_read",
  "completed",
  "abandoned",
];

export default function BookshelfPublicView({
  items,
}: {
  items: Record<string, unknown>[];
}) {
  const books = items as unknown as Book[];
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stats = useMemo(() => {
    let total = 0;
    let reading = 0;
    let completed = 0;
    let ratedSum = 0;
    let ratedCount = 0;

    for (const book of books) {
      total += 1;
      if (book.payload.status === "reading") reading += 1;
      if (book.payload.status === "completed") completed += 1;
      if (book.payload.rating) {
        ratedSum += book.payload.rating;
        ratedCount += 1;
      }
    }

    return {
      total,
      reading,
      completed,
      avgRating: ratedCount > 0 ? ratedSum / ratedCount : 0,
    };
  }, [books]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return books.filter((book) => {
      if (statusFilter !== "all" && book.payload.status !== statusFilter)
        return false;
      if (!query) return true;
      const haystack =
        `${book.payload.title} ${book.payload.author} ${book.payload.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [books, statusFilter, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<BookStatus, Book[]> = {
      reading: [],
      want_to_read: [],
      completed: [],
      abandoned: [],
    };

    for (const book of filtered) {
      map[book.payload.status].push(book);
    }

    return map;
  }, [filtered]);

  const now = useMemo(() => new Date(), []);

  if (books.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-20">
        <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No books on the shelf yet.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
                Bookshelf
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                A curated collection of what I am reading and learning.
              </p>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center md:text-left">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Books</p>
                <p className="text-lg font-semibold text-zinc-50 leading-tight">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Reading</p>
                <p className="text-lg font-semibold text-warning leading-tight">
                  {stats.reading}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Done</p>
                <p className="text-lg font-semibold text-success leading-tight">
                  {stats.completed}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Rating</p>
                <p className="text-lg font-semibold text-zinc-50 leading-tight">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="bookshelf-public-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, author, tags..."
              aria-label="Search books"
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35 transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              aria-label="Show all books"
              aria-pressed={statusFilter === "all"}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                statusFilter === "all"
                  ? "bg-accent/15 border-accent/35 text-accent"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              All
            </button>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-label={`Show ${STATUS_LABELS[status].toLowerCase()} books`}
                aria-pressed={statusFilter === status}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  statusFilter === status
                    ? STATUS_STYLES[status]
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
                )}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Book List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40"
        >
          <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No books found for current filters.</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const sectionBooks = grouped[status] || [];
            if (sectionBooks.length === 0) return null;

            return (
              <section key={status} className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                  <h3 className="text-lg font-semibold text-zinc-50">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                      STATUS_STYLES[status],
                    )}
                  >
                    {sectionBooks.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {sectionBooks.map((book, i) => (
                      <BookCard
                        key={book._id}
                        book={book}
                        index={i}
                        now={now}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
