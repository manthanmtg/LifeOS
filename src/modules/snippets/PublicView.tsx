"use client";

import { useMemo, useState } from "react";
import { Code, Copy, Check, Star, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Snippet {
    _id: string;
    payload: {
        title: string;
        code: string;
        language: string;
        description?: string;
        tags: string[];
        is_favorite: boolean;
    };
}

export default function SnippetsPublicView({ items }: { items: Record<string, unknown>[] }) {
    const snippets = items as unknown as Snippet[];
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [languageFilter, setLanguageFilter] = useState<string>("all");
    const [favoritesOnly, setFavoritesOnly] = useState(false);

    const availableLanguages = useMemo(() => {
        return [...new Set(snippets.map((snippet) => snippet.payload.language))].sort((a, b) => a.localeCompare(b));
    }, [snippets]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return [...snippets]
            .filter((snippet) => {
                if (languageFilter !== "all" && snippet.payload.language !== languageFilter) return false;
                if (favoritesOnly && !snippet.payload.is_favorite) return false;
                if (!query) return true;

                const haystack = `${snippet.payload.title} ${snippet.payload.code} ${snippet.payload.description || ""} ${snippet.payload.tags.join(" ")}`.toLowerCase();
                return haystack.includes(query);
            })
            .sort((a, b) => {
                if (a.payload.is_favorite !== b.payload.is_favorite) {
                    return a.payload.is_favorite ? -1 : 1;
                }
                return a.payload.title.localeCompare(b.payload.title);
            });
    }, [snippets, languageFilter, favoritesOnly, searchQuery]);

    const handleCopy = async (id: string, snippetCode: string) => {
        await navigator.clipboard.writeText(snippetCode);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1800);
    };

    if (snippets.length === 0) {
        return (
            <div className="text-center text-zinc-500 py-20">
                <Code className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No snippets shared yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search title, code, tags"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>

                    <button
                        onClick={() => setFavoritesOnly((prev) => !prev)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5",
                            favoritesOnly
                                ? "bg-warning/15 border-warning/30 text-warning"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        <Star className="w-3.5 h-3.5" fill={favoritesOnly ? "currentColor" : "none"} /> Favorites
                    </button>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setLanguageFilter("all")}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                languageFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            All
                        </button>
                        {availableLanguages.map((language) => (
                            <button
                                key={language}
                                onClick={() => setLanguageFilter(language)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                    languageFilter === language
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                {language}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Code className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No snippets found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filtered.map((snippet) => (
                        <article key={snippet._id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-700 transition-colors">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                                <div className="flex items-center gap-2 min-w-0">
                                    {snippet.payload.is_favorite && <Star className="w-3.5 h-3.5 text-warning shrink-0" fill="currentColor" />}
                                    <p className="text-sm font-medium text-zinc-50 truncate">{snippet.payload.title}</p>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">{snippet.payload.language}</span>
                                </div>
                                <button
                                    onClick={() => handleCopy(snippet._id, snippet.payload.code)}
                                    className={cn(
                                        "p-1.5 rounded-md transition-colors",
                                        copiedId === snippet._id
                                            ? "text-success bg-success/10"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                    )}
                                >
                                    {copiedId === snippet._id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <pre className="px-4 py-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-[240px] overflow-y-auto">
                                <code>{snippet.payload.code}</code>
                            </pre>

                            {(snippet.payload.description || snippet.payload.tags.length > 0) && (
                                <div className="px-4 py-2 border-t border-zinc-800">
                                    {snippet.payload.description && <p className="text-xs text-zinc-500 line-clamp-1">{snippet.payload.description}</p>}
                                    {snippet.payload.tags.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                            {snippet.payload.tags.slice(0, 6).map((tag) => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
