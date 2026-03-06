"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    Library,
    Star,
    Settings,
    Check,
    Search,
    BookOpen,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";

const STATUSES = ["want_to_read", "reading", "completed", "abandoned"] as const;
const STATUS_LABELS: Record<string, string> = {
    want_to_read: "Want to Read",
    reading: "Reading",
    completed: "Completed",
    abandoned: "Abandoned",
};
const STATUS_STYLES: Record<string, string> = {
    want_to_read: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    reading: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
    completed: "bg-green-500/15 text-green-300 border-green-500/25",
    abandoned: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

interface Book {
    _id: string;
    created_at: string;
    payload: {
        title: string;
        author: string;
        isbn?: string;
        cover_url?: string;
        status: string;
        total_pages?: number;
        current_page: number;
        rating?: number;
        started_at?: string;
        finished_at?: string;
        summary?: string;
        notes?: string;
        tags: string[];
    };
}

const BOOKSHELF_DEFAULTS = { defaultStatus: "want_to_read", yearlyGoal: 0 };

function toDateInputValue(iso?: string) {
    if (!iso) return "";
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function toISODate(dateInput: string) {
    if (!dateInput) return undefined;
    const parsed = new Date(dateInput);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    return parsed.toISOString();
}

export default function BookshelfAdminView() {
    const { settings, updateSettings, saving: settingsSaving } = useModuleSettings("bookshelfSettings", BOOKSHELF_DEFAULTS);

    const [showSettings, setShowSettings] = useState(false);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [status, setStatus] = useState<string>(settings.defaultStatus);
    const [totalPages, setTotalPages] = useState("");
    const [currentPage, setCurrentPage] = useState("");
    const [rating, setRating] = useState(0);
    const [coverUrl, setCoverUrl] = useState("");
    const [summary, setSummary] = useState("");
    const [notes, setNotes] = useState("");
    const [startedAt, setStartedAt] = useState("");
    const [finishedAt, setFinishedAt] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [formError, setFormError] = useState("");

    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const resetForm = () => {
        setTitle("");
        setAuthor("");
        setStatus(settings.defaultStatus);
        setTotalPages("");
        setCurrentPage("");
        setRating(0);
        setCoverUrl("");
        setSummary("");
        setNotes("");
        setStartedAt("");
        setFinishedAt("");
        setTagsInput("");
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError("");

        if (!title.trim()) {
            setFormError("Title required");
            return;
        }
        if (!author.trim()) {
            setFormError("Author required");
            return;
        }

        const totalPagesNumber = totalPages ? Number.parseInt(totalPages, 10) : undefined;
        const currentPageNumber = currentPage ? Number.parseInt(currentPage, 10) : 0;

        if (Number.isFinite(totalPagesNumber) && totalPagesNumber !== undefined && currentPageNumber > totalPagesNumber) {
            setFormError("Current page cannot exceed total pages");
            return;
        }

        const payload: Record<string, unknown> = {
            title: title.trim(),
            author: author.trim(),
            status,
            total_pages: totalPagesNumber,
            current_page: currentPageNumber,
            rating: rating || undefined,
            cover_url: coverUrl.trim() || undefined,
            summary: summary.trim() || undefined,
            notes: notes.trim() || undefined,
            started_at: toISODate(startedAt) || (status === "reading" && !editingId ? new Date().toISOString() : undefined),
            finished_at: toISODate(finishedAt) || (status === "completed" && !editingId ? new Date().toISOString() : undefined),
            tags: tagsInput
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
        };

        setIsSubmitting(true);
        try {
            const res = editingId
                ? await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                })
                : await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "book", is_public: false, payload }),
                });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save book");

            resetForm();
            await fetchBooks();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (book: Book) => {
        setTitle(book.payload.title);
        setAuthor(book.payload.author);
        setStatus(book.payload.status);
        setTotalPages(book.payload.total_pages?.toString() || "");
        setCurrentPage((book.payload.current_page || 0).toString());
        setRating(book.payload.rating || 0);
        setCoverUrl(book.payload.cover_url || "");
        setSummary(book.payload.summary || "");
        setNotes(book.payload.notes || "");
        setStartedAt(toDateInputValue(book.payload.started_at));
        setFinishedAt(toDateInputValue(book.payload.finished_at));
        setTagsInput((book.payload.tags || []).join(", "));
        setEditingId(book._id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
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
    };

    const sortedBooks = useMemo(() => {
        return [...books].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [books]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return sortedBooks.filter((book) => {
            if (statusFilter !== "all" && book.payload.status !== statusFilter) return false;
            if (!query) return true;
            const haystack = `${book.payload.title} ${book.payload.author} ${book.payload.tags.join(" ")}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [sortedBooks, statusFilter, searchQuery]);

    const stats = useMemo(() => {
        const total = books.length;
        const reading = books.filter((book) => book.payload.status === "reading").length;
        const completed = books.filter((book) => book.payload.status === "completed").length;
        const goal = Number(settings.yearlyGoal || 0);
        const goalProgress = goal > 0 ? Math.min(100, (completed / goal) * 100) : 0;
        return { total, reading, completed, goal, goalProgress };
    }, [books, settings.yearlyGoal]);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Bookshelf</h1>
                            <p className="text-zinc-400 mt-1">Track reading momentum, completion velocity, and yearly goals in one dashboard.</p>
                        </div>
                        <div className="flex items-center gap-2 md:pt-1">
                            <button
                                onClick={() => setShowSettings((prev) => !prev)}
                                className={cn(
                                    "px-3 py-2.5 rounded-xl text-sm transition-colors",
                                    showSettings ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowForm(true);
                                }}
                                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Book
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Tracked</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Currently Reading</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.reading}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Completed</p>
                            <p className="text-lg font-semibold text-green-300">{stats.completed}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Yearly Goal</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.goal > 0 ? stats.goal : "Not set"}</p>
                        </div>
                    </div>

                    {stats.goal > 0 && (
                        <div>
                            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                                <span>Goal Progress</span>
                                <span>{stats.completed}/{stats.goal}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${stats.goalProgress}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showSettings && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">Bookshelf Settings</h2>
                        {settingsSaving && (
                            <span className="text-xs text-accent flex items-center gap-1">
                                <Check className="w-3 h-3" /> Saved
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Default Book Status</label>
                            <select
                                value={settings.defaultStatus}
                                onChange={(event) => updateSettings({ defaultStatus: event.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                {STATUSES.map((item) => (
                                    <option key={item} value={item}>
                                        {STATUS_LABELS[item]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Yearly Reading Goal</label>
                            <input
                                type="number"
                                min={0}
                                value={settings.yearlyGoal || ""}
                                onChange={(event) => updateSettings({ yearlyGoal: Number.parseInt(event.target.value, 10) || 0 })}
                                placeholder="0 = no goal"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Used to track completed books against annual target.</p>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "Add"} Book</h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="book-title" className="block text-xs text-zinc-500 mb-1.5">Title</label>
                            <input
                                id="book-title"
                                type="text"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Book title"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <label htmlFor="book-author" className="block text-xs text-zinc-500 mb-1.5">Author</label>
                            <input
                                id="book-author"
                                type="text"
                                value={author}
                                onChange={(event) => setAuthor(event.target.value)}
                                placeholder="Author"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <label htmlFor="book-status" className="block text-xs text-zinc-500 mb-1.5">Status</label>
                            <select
                                id="book-status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            >
                                {STATUSES.map((item) => (
                                    <option key={item} value={item}>
                                        {STATUS_LABELS[item]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="book-cover" className="block text-xs text-zinc-500 mb-1.5">Cover URL (optional)</label>
                            <input
                                id="book-cover"
                                type="url"
                                value={coverUrl}
                                onChange={(event) => setCoverUrl(event.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label htmlFor="book-total-pages" className="block text-xs text-zinc-500 mb-1.5">Total Pages</label>
                                <input
                                    id="book-total-pages"
                                    type="number"
                                    min={0}
                                    value={totalPages}
                                    onChange={(event) => setTotalPages(event.target.value)}
                                    placeholder="300"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="book-current-page" className="block text-xs text-zinc-500 mb-1.5">Current Page</label>
                                <input
                                    id="book-current-page"
                                    type="number"
                                    min={0}
                                    value={currentPage}
                                    onChange={(event) => setCurrentPage(event.target.value)}
                                    placeholder="0"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label htmlFor="book-started" className="block text-xs text-zinc-500 mb-1.5">Started Date</label>
                                <input
                                    id="book-started"
                                    type="date"
                                    value={startedAt}
                                    onChange={(event) => setStartedAt(event.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="book-finished" className="block text-xs text-zinc-500 mb-1.5">Finished Date</label>
                                <input
                                    id="book-finished"
                                    type="date"
                                    value={finishedAt}
                                    onChange={(event) => setFinishedAt(event.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Rating</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star === rating ? 0 : star)}
                                        disabled={isSubmitting}
                                        aria-label={`Rate ${star} stars`}
                                        className={cn(
                                            "p-1 transition-colors disabled:opacity-50",
                                            star <= rating ? "text-yellow-400" : "text-zinc-500 hover:text-zinc-400"
                                        )}
                                    >
                                        <Star className="w-5 h-5" fill={star <= rating ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="book-tags" className="block text-xs text-zinc-500 mb-1.5">Tags</label>
                            <input
                                id="book-tags"
                                type="text"
                                value={tagsInput}
                                onChange={(event) => setTagsInput(event.target.value)}
                                placeholder="fiction, self-help"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="book-summary" className="block text-xs text-zinc-500 mb-1.5">Summary</label>
                            <textarea
                                id="book-summary"
                                value={summary}
                                onChange={(event) => setSummary(event.target.value)}
                                rows={2}
                                placeholder="Short summary"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="book-notes" className="block text-xs text-zinc-500 mb-1.5">Notes</label>
                            <textarea
                                id="book-notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                rows={3}
                                placeholder="Personal notes"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                            {formError && <span className="text-red-400 text-xs self-center">{formError}</span>}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                aria-label={editingId ? "Update book" : "Add book"}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                {isSubmitting ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update" : "Add")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search title, author, tags"
                            aria-label="Search books"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                statusFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All
                        </button>
                        {STATUSES.map((item) => (
                            <button
                                key={item}
                                onClick={() => setStatusFilter(item)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    statusFilter === item
                                        ? STATUS_STYLES[item]
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {STATUS_LABELS[item]}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 ml-auto">{filtered.length} visible</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
                        <span>Loading your shelf...</span>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No books found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((book) => {
                        const total = book.payload.total_pages || 0;
                        const current = book.payload.current_page || 0;
                        const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;

                        return (
                            <article key={book._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group">
                                <div className="flex items-start gap-3">
                                    <div className="w-14 h-20 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                        {book.payload.cover_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={book.payload.cover_url} alt={book.payload.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <BookOpen className="w-4 h-4 text-zinc-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-zinc-50 line-clamp-2">{book.payload.title}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{book.payload.author}</p>
                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", STATUS_STYLES[book.payload.status])}>
                                                {STATUS_LABELS[book.payload.status]}
                                            </span>
                                            {book.payload.rating ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300">
                                                    {book.payload.rating}★
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(book)}
                                            disabled={isDeletingId === book._id}
                                            aria-label="Edit book"
                                            title="Edit book"
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(book._id)}
                                            disabled={isDeletingId === book._id}
                                            aria-label="Delete book"
                                            title="Delete book"
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-50"
                                        >
                                            {isDeletingId === book._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {total > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                                            <span>{current}/{total} pages</span>
                                            <span>{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                )}

                                {book.payload.summary && <p className="text-xs text-zinc-400 line-clamp-2">{book.payload.summary}</p>}

                                {(book.payload.tags || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-auto">
                                        {book.payload.tags.slice(0, 4).map((tag) => (
                                            <span key={tag} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px]">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
