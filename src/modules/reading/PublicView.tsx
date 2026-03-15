"use client";

import { useMemo, useState } from "react";
import {
    BookOpen,
    ExternalLink,
    ArrowUpCircle,
    ArrowRightCircle,
    ArrowDownCircle,
    Search,
    Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
    high: "bg-danger/15 text-danger border-danger/25",
    medium: "bg-warning/15 text-warning border-warning/25",
    low: "bg-success/15 text-success border-success/25",
};
const PRIORITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    high: ArrowUpCircle,
    medium: ArrowRightCircle,
    low: ArrowDownCircle,
};

interface ReadingItem {
    _id: string;
    payload: {
        url: string;
        title: string;
        source_domain?: string;
        priority: string;
        type: string;
        is_read: boolean;
        notes?: string;
        tags?: string[];
    };
    created_at: string;
}

export default function ReadingPublicView({ items }: { items: Record<string, unknown>[] }) {
    const readings = items as unknown as ReadingItem[];
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"unread" | "read" | "all">("unread");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [tagFilter, setTagFilter] = useState<string>("all");

    const stats = useMemo(() => {
        const unread = readings.filter((item) => !item.payload.is_read).length;
        const read = readings.filter((item) => item.payload.is_read).length;
        const high = readings.filter((item) => !item.payload.is_read && item.payload.priority === "high").length;
        const types = new Set(readings.map((item) => item.payload.type)).size;
        return { total: readings.length, unread, read, high, types };
    }, [readings]);

    const availableTypes = useMemo(() => {
        return [...new Set(readings.map((item) => item.payload.type))].sort((a, b) => a.localeCompare(b));
    }, [readings]);

    const allUniqueTags = useMemo(() => {
        const tags = new Set<string>();
        readings.forEach((item) => {
            item.payload.tags?.forEach((tag) => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [readings]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

        return [...readings]
            .filter((item) => {
                if (statusFilter === "unread" && item.payload.is_read) return false;
                if (statusFilter === "read" && !item.payload.is_read) return false;
                if (typeFilter !== "all" && item.payload.type !== typeFilter) return false;
                if (tagFilter !== "all" && !item.payload.tags?.includes(tagFilter)) return false;
                if (!query) return true;

                const tagsString = (item.payload.tags || []).join(" ");
                const haystack = `${item.payload.title} ${item.payload.source_domain || ""} ${item.payload.type} ${item.payload.notes || ""} ${tagsString}`.toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => {
                const prioritySort = (priorityOrder[a.payload.priority] ?? 1) - (priorityOrder[b.payload.priority] ?? 1);
                if (prioritySort !== 0) return prioritySort;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }, [readings, searchQuery, statusFilter, typeFilter, tagFilter]);

    if (readings.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No reading items shared yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-warning/10 blur-3xl" />

                <div className="relative space-y-4">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">My reading queue and curated references.</h2>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Unread</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.unread}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Read</p>
                            <p className="text-lg font-semibold text-success">{stats.read}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">High Priority</p>
                            <p className="text-lg font-semibold text-danger">{stats.high}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Types</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.types}</p>
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
                            placeholder="Search title, domain, notes"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {[
                            { key: "unread", label: "Unread" },
                            { key: "read", label: "Read" },
                            { key: "all", label: "All" },
                        ].map((option) => (
                            <button
                                key={option.key}
                                onClick={() => setStatusFilter(option.key as "unread" | "read" | "all")}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    statusFilter === option.key
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setTypeFilter("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                typeFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All Types
                        </button>
                        {availableTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors",
                                    typeFilter === type
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {allUniqueTags.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50 flex-wrap">
                            <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-800/50">
                                <Tag className="w-3 h-3 text-zinc-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tags</span>
                            </div>
                            <button
                                onClick={() => setTagFilter("all")}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                                    tagFilter === "all"
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                All Tags
                            </button>
                            {allUniqueTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setTagFilter(tag)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                                        tagFilter === tag
                                            ? "bg-accent/15 border-accent/35 text-accent"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No reading items found for current filters.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((item) => {
                        const PriorityIcon = PRIORITY_ICONS[item.payload.priority] || ArrowRightCircle;

                        return (
                            <a
                                key={item._id}
                                href={item.payload.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors group",
                                    item.payload.is_read && "opacity-65"
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className={cn("text-sm font-medium truncate", item.payload.is_read ? "text-zinc-500 line-through" : "text-zinc-50")}>
                                            {item.payload.title}
                                        </p>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium inline-flex items-center gap-1", PRIORITY_STYLES[item.payload.priority])}>
                                            <PriorityIcon className="w-3 h-3" /> {item.payload.priority}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 capitalize">
                                            {item.payload.type}
                                        </span>
                                        {item.payload.tags?.map((tag) => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded border border-accent/20 bg-accent/5 text-accent/80">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                                        {item.payload.source_domain && <span>{item.payload.source_domain}</span>}
                                        {item.payload.notes && <span className="line-clamp-1">{item.payload.notes}</span>}
                                    </div>
                                </div>

                                <ExternalLink className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-zinc-300" />
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
