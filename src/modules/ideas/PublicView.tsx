"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import IdeaDetailsModal from "./IdeaDetailsModal";
import {
    IDEA_PRIORITY_STYLES,
    IDEA_STATUS_LABELS,
    IDEA_STATUS_STYLES,
    type IdeaRecord,
} from "./shared";

export default function IdeasPublicView({ items }: { items: Record<string, unknown>[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedIdea, setSelectedIdea] = useState<IdeaRecord | null>(null);

    const ideas = (items as unknown as IdeaRecord[]).filter((idea) => idea.payload.status !== "archived");

    const stats = useMemo(() => {
        const total = ideas.length;
        const promoted = ideas.filter((idea) => idea.payload.promoted_to_portfolio).length;
        const exploring = ideas.filter((idea) => idea.payload.status === "exploring").length;
        return { total, promoted, exploring };
    }, [ideas]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return ideas.filter((idea) => {
            if (statusFilter !== "all" && idea.payload.status !== statusFilter) return false;
            if (!query) return true;

            const haystack = `${idea.payload.title} ${idea.payload.description || ""} ${idea.payload.category || ""} ${idea.payload.tags.join(" ")}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [ideas, statusFilter, searchQuery]);

    if (ideas.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No ideas shared yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-green-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Explorations, concepts, and projects in motion.</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Visible Ideas</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Promoted</p>
                            <p className="text-lg font-semibold text-green-300">{stats.promoted}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Exploring</p>
                            <p className="text-lg font-semibold text-blue-300">{stats.exploring}</p>
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
                            placeholder="Search title, description, tags"
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
                        {["raw", "exploring"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    statusFilter === status
                                        ? IDEA_STATUS_STYLES[status]
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {IDEA_STATUS_LABELS[status]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No ideas found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((idea) => (
                        <article key={idea._id} className="bg-zinc-900 border border-zinc-800 rounded-xl transition-colors hover:border-zinc-700">
                            <button
                                type="button"
                                onClick={() => setSelectedIdea(idea)}
                                aria-label={`Open details for ${idea.payload.title}`}
                                className="block w-full rounded-xl p-4 text-start focus:outline-none focus:ring-2 focus:ring-accent/40"
                            >
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", IDEA_STATUS_STYLES[idea.payload.status])}>
                                        {IDEA_STATUS_LABELS[idea.payload.status]}
                                    </span>
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", IDEA_PRIORITY_STYLES[idea.payload.priority] || IDEA_PRIORITY_STYLES.medium)}>
                                        {idea.payload.priority}
                                    </span>
                                    {idea.payload.category && <span className="text-[10px] text-zinc-500">{idea.payload.category}</span>}
                                </div>

                                <p className="text-sm font-medium text-zinc-50 mb-2">{idea.payload.title}</p>
                                {idea.payload.description && <p className="text-xs text-zinc-400 mb-3 line-clamp-3">{idea.payload.description}</p>}

                                {idea.payload.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-auto">
                                        {idea.payload.tags.slice(0, 5).map((tag) => (
                                            <span key={tag} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        </article>
                    ))}
                </div>
            )}

            <IdeaDetailsModal
                idea={selectedIdea}
                isOpen={!!selectedIdea}
                onClose={() => setSelectedIdea(null)}
            />
        </div>
    );
}
