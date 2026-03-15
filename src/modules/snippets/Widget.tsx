"use client";

import { useMemo, useState, useEffect } from "react";
import { Code, Star } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Snippet {
    payload: {
        title: string;
        is_favorite: boolean;
        language: string;
    };
}

export default function SnippetsWidget() {
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=snippet")
            .then((response) => response.json())
            .then((data) => setSnippets(data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const favorites = snippets.filter((snippet) => snippet.payload.is_favorite);
        const languages = new Set(snippets.map((snippet) => snippet.payload.language));

        return {
            total: snippets.length,
            favorites: favorites.length,
            languageCount: languages.size,
            spotlight: favorites[0] || snippets[0],
        };
    }, [snippets]);

    return (
        <WidgetCard
            title="Snippets"
            icon={Code}
            loading={loading}
            href="/admin/snippets"
            footer={
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span className="flex items-center gap-1 text-warning/80">
                        <Star className="w-3 h-3" fill="currentColor" /> {summary.favorites} Starred
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Code className="w-3 h-3" /> {summary.languageCount} Langs
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">reusable code modules</p>
                </div>

                {summary.spotlight && (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-1.5">Spotlight</p>
                        <p className="text-[13px] text-zinc-300 font-medium line-clamp-1 leading-relaxed">{summary.spotlight.payload.title}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-2">{summary.spotlight.payload.language}</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
