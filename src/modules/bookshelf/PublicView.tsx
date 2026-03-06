"use client";

import { useMemo, useState } from "react";
import { Library, Search, Star, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

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
    payload: {
        title: string;
        author: string;
        status: string;
        total_pages?: number;
        current_page: number;
        rating?: number;
        cover_url?: string;
        summary?: string;
        tags: string[];
    };
}

const STATUS_ORDER = ["reading", "want_to_read", "completed", "abandoned"];

export default function BookshelfPublicView({ items }: { items: Record<string, unknown>[] }) {
    const books = items as unknown as Book[];
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const stats = useMemo(() => {
        const total = books.length;
        const reading = books.filter((book) => book.payload.status === "reading").length;
        const completed = books.filter((book) => book.payload.status === "completed").length;
        const avgRating = books.filter((book) => !!book.payload.rating).reduce((sum, book) => sum + (book.payload.rating || 0), 0) /
            Math.max(1, books.filter((book) => !!book.payload.rating).length);

        return {
            total,
            reading,
            completed,
            avgRating: Number.isFinite(avgRating) ? avgRating : 0,
        };
    }, [books]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return books.filter((book) => {
            if (statusFilter !== "all" && book.payload.status !== statusFilter) return false;
            if (!query) return true;
            const haystack = `${book.payload.title} ${book.payload.author} ${book.payload.tags.join(" ")}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [books, statusFilter, searchQuery]);

    const grouped = useMemo(() => {
        const map: Record<string, Book[]> = {};
        for (const status of STATUS_ORDER) {
            map[status] = filtered.filter((book) => book.payload.status === status);
        }
        return map;
    }, [filtered]);

    if (books.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No books on the shelf yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">A curated bookshelf of what I am learning.</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Books</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Reading</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.reading}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Completed</p>
                            <p className="text-lg font-semibold text-green-300">{stats.completed}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Avg Rating</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search title, author, tags"
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
                        {STATUS_ORDER.map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    statusFilter === status
                                        ? STATUS_STYLES[status]
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {STATUS_LABELS[status]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No books found for current filters.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {STATUS_ORDER.map((status) => {
                        const sectionBooks = grouped[status] || [];
                        if (sectionBooks.length === 0) return null;

                        return (
                            <section key={status} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-zinc-50">{STATUS_LABELS[status]}</h3>
                                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", STATUS_STYLES[status])}>
                                        {sectionBooks.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {sectionBooks.map((book) => {
                                        const total = book.payload.total_pages || 0;
                                        const current = book.payload.current_page || 0;
                                        const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;

                                        return (
                                            <article key={book._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-14 h-20 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                        {book.payload.cover_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={book.payload.cover_url} alt={book.payload.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <BookOpen className="w-4 h-4 text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-zinc-50 line-clamp-2">{book.payload.title}</p>
                                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{book.payload.author}</p>
                                                        {book.payload.rating ? (
                                                            <div className="flex items-center gap-0.5 mt-1.5">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={cn(
                                                                            "w-3.5 h-3.5",
                                                                            star <= (book.payload.rating || 0) ? "text-yellow-400" : "text-zinc-700"
                                                                        )}
                                                                        fill={star <= (book.payload.rating || 0) ? "currentColor" : "none"}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {total > 0 && status === "reading" && (
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

                                                {book.payload.tags.length > 0 && (
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
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
