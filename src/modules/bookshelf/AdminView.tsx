"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Settings, Library, RefreshCw } from "lucide-react";
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
    const total = books.length;
    const reading = books.filter((b) => b.payload.status === "reading").length;
    const completed = books.filter(
      (b) => b.payload.status === "completed",
    ).length;
    const wantToRead = books.filter(
      (b) => b.payload.status === "want_to_read",
    ).length;
    const abandoned = books.filter(
      (b) => b.payload.status === "abandoned",
    ).length;
    const goal = Number(settings.yearlyGoal || 0);
    const goalProgress = goal > 0 ? Math.min(100, (completed / goal) * 100) : 0;

    const ratedBooks = books.filter((b) => b.payload.rating);
    const avgRating =
      ratedBooks.length > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.payload.rating || 0), 0) /
          ratedBooks.length
        : 0;

    const completedBooks = books.filter(
      (b) => b.payload.status === "completed",
    );
    const totalPagesRead = completedBooks.reduce(
      (sum, b) => sum + (b.payload.total_pages || 0),
      0,
    );
    const avgPagesPerBook =
      completedBooks.length > 0 ? totalPagesRead / completedBooks.length : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Monthly completions for sparkline (last 6 months)
    const monthlyCompletions: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = books.filter((b) => {
        if (b.payload.status !== "completed" || !b.payload.finished_at)
          return false;
        const d = new Date(b.payload.finished_at);
        return d >= monthStart && d <= monthEnd;
      }).length;
      monthlyCompletions.push(count);
    }

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
          return (
            dir *
            (new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime())
          );
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

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

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
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Book
              </button>
            </div>
          </div>

          {/* Metrics */}
          <BookshelfMetrics books={books} stats={stats} />
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
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
            <span>Loading your shelf...</span>
          </div>
        </div>
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
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
