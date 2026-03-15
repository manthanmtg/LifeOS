"use client";

import { useMemo, useState, useEffect } from "react";
import { Library, BookOpen, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Book {
    payload: {
        title: string;
        status: string;
        current_page: number;
        total_pages?: number;
        rating?: number;
    };
}

export default function BookshelfWidget() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=book")
            .then((response) => response.json())
            .then((data) => setBooks(data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const reading = books.filter((book) => book.payload.status === "reading");
        const completed = books.filter((book) => book.payload.status === "completed");
        const ratedBooks = books.filter((book) => !!book.payload.rating);
        const avgRating = ratedBooks.reduce((sum, book) => sum + (book.payload.rating || 0), 0) /
            Math.max(1, ratedBooks.length);

        const current = reading[0];
        const progress = current?.payload.total_pages
            ? Math.min(100, ((current.payload.current_page || 0) / current.payload.total_pages) * 100)
            : 0;

        return {
            total: books.length,
            readingCount: reading.length,
            completedCount: completed.length,
            avgRating: Number.isFinite(avgRating) ? avgRating : 0,
            current,
            progress,
        };
    }, [books]);

    return (
        <WidgetCard
            title="Library"
            icon={Library}
            loading={loading}
            href="/admin/bookshelf"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-success/80">
                        <Sparkles className="w-3 h-3" /> {summary.completedCount} Compiled
                    </span>
                    <span className={cn("inline-flex items-center gap-1", summary.avgRating > 0 ? "text-warning/80" : "text-zinc-500")}>
                        <Star className="w-3 h-3" fill={summary.avgRating > 0 ? "currentColor" : "none"} />
                        {summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "N/A"}
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">knowledge repositories recorded</p>
                </div>

                {summary.current ? (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Active Learning</p>
                            <span className="text-[10px] font-bold text-accent">{summary.progress.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">{summary.current.payload.title}</p>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-900 border border-zinc-800/50 overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${summary.progress}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
                        <p className="text-[11px] text-zinc-500 text-center font-medium">Awaiting next sequence.</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
