"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Settings, Library } from "lucide-react";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

import type { Book, BookshelfStats, BookStatus } from "./components/types";
import { BOOKSHELF_DEFAULTS } from "./components/types";
import BookshelfMetrics from "./components/BookshelfMetrics";
import BookshelfFilters from "./components/BookshelfFilters";
import type { SortField, SortDirection } from "./components/BookshelfFilters";
import BookCard from "./components/BookCard";
import BookForm from "./components/BookForm";
import BookshelfSettingsPanel from "./components/BookshelfSettings";
import BookSkeleton from "./components/BookSkeleton";

export default function BookshelfAdminView() {
  const {
    settings,
    updateSettings,
    saving: settingsSaving,
  } = useModuleSettings("bookshelfSettings", BOOKSHELF_DEFAULTS);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/content?module_type=book");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch books");
      setBooks(data.data || []);
    } catch (err: unknown) {
      console.error("fetchBooks failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Compute stats with monthly completions for sparklines
  const stats: BookshelfStats = useMemo(() => {
    let reading = 0;
    let completed = 0;
    let wantToRead = 0;
    let abandoned = 0;
    let ratingSum = 0;
    let ratedCount = 0;
    let totalPagesRead = 0;

    const now = new Date();
    // Precompute the last 6 months boundaries to bucket completed books
    const monthBoundaries = Array.from({ length: 6 }, (_, i) => {
      const idx = 5 - i;
      return {
        start: new Date(now.getFullYear(), now.getMonth() - idx, 1),
        end: new Date(now.getFullYear(), now.getMonth() - idx + 1, 1),
        count: 0,
      };
    });

    for (const b of books) {
      const status = b.payload.status;
      if (status === "reading") reading++;
      else if (status === "completed") {
        completed++;
        totalPagesRead += b.payload.total_pages || 0;

        if (b.payload.finished_at) {
          const d = new Date(b.payload.finished_at);
          for (const m of monthBoundaries) {
            if (d >= m.start && d < m.end) {
              m.count++;
              break;
            }
          }
        }
      } else if (status === "want_to_read") wantToRead++;
      else if (status === "abandoned") abandoned++;

      if (b.payload.rating) {
        ratingSum += b.payload.rating;
        ratedCount++;
      }
    }

    const total = books.length;
    const goal = Number(settings.yearlyGoal || 0);
    const goalProgress = goal > 0 ? Math.min(100, (completed / goal) * 100) : 0;
    const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;
    const avgPagesPerBook = completed > 0 ? totalPagesRead / completed : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const monthlyCompletions = monthBoundaries.map((m) => m.count);

    return {
      total,
      reading,
      completed,
      wantToRead,
      abandoned,
      goal,
      goalProgress,
      avgRating,
      totalPagesRead,
      avgPagesPerBook,
      completionRate,
      monthlyCompletions,
    };
  }, [books, settings.yearlyGoal]);

  // Sort + filter
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = books.filter((book) => {
      if (statusFilter !== "all" && book.payload.status !== statusFilter)
        return false;
      if (!query) return true;
      const haystack =
        `${book.payload.title} ${book.payload.author} ${book.payload.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });

    result.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "title":
          return dir * a.payload.title.localeCompare(b.payload.title);
        case "author":
          return dir * a.payload.author.localeCompare(b.payload.author);
        case "rating":
          return dir * ((a.payload.rating || 0) - (b.payload.rating || 0));
        default:
          return dir * a.created_at.localeCompare(b.created_at);
      }
    });

    return result;
  }, [books, statusFilter, searchQuery, sortField, sortDirection]);

  const handleEdit = useCallback((book: Book) => {
    setEditingBook(book);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this book?")) return;
      setIsDeletingId(id);
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
        await fetchBooks();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete";
        alert(message);
      } finally {
        setIsDeletingId(null);
      }
    },
    [fetchBooks],
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingBook(null);
  }, []);

  const handleOpenNewForm = useCallback(() => {
    setEditingBook(null);
    setShowForm(true);
  }, []);

  const now = useMemo(() => new Date(), []);

  if (loading && books.length === 0) {
    return <AdminModuleSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                Bookshelf
              </h1>
              <p className="text-zinc-400 mt-1">
                Track reading momentum, completion velocity, and yearly goals.
              </p>
            </div>
            <div className="flex items-center gap-2 md:pt-1">
              <button
                onClick={() => setShowSettings((prev) => !prev)}
                aria-label="Bookshelf settings"
                title="Bookshelf settings"
                className={cn(
                  "px-3 py-2.5 rounded-xl text-sm transition-colors",
                  showSettings
                    ? "bg-accent/15 text-accent"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-300",
                )}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenNewForm}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Book
              </button>
            </div>
          </div>

          {/* Metrics */}
          <BookshelfMetrics
            books={books}
            stats={stats}
            loading={loading && books.length === 0}
          />
        </div>
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <BookshelfSettingsPanel
            settings={settings}
            onUpdateSettings={updateSettings}
            saving={settingsSaving}
          />
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <BookForm
            editingBook={editingBook}
            defaultStatus={settings.defaultStatus as BookStatus}
            onSave={fetchBooks}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>

      {/* Filters */}
      <BookshelfFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        totalVisible={filtered.length}
        totalBooks={books.length}
      />

      {/* Book Grid */}
      <div className="relative">
        {loading && books.length > 0 && (
          <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
              <Plus className="w-5 h-5 text-accent animate-spin" />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Updating Library</span>
            </div>
          </div>
        )}

        {loading && books.length === 0 ? (
          <BookSkeleton />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40"
          >
            <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No books found for current filters.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((book, i) => (
                <BookCard
                  key={book._id}
                  book={book}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeletingId={isDeletingId}
                  index={i}
                  now={now}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
