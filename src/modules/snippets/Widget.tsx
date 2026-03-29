"use client";

import { useMemo, useState, useEffect } from "react";
import { Code, Star } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

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
      .then((r) => r.json())
      .then((data) => setSnippets(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const favorites = snippets.filter((s) => s.payload.is_favorite);
    const languages = new Set(snippets.map((s) => s.payload.language));
    const spotlight = favorites[0] || snippets[0];
    return {
      total: snippets.length,
      favorites: favorites.length,
      languageCount: languages.size,
      spotlight,
    };
  }, [snippets]);

  return (
    <WidgetCard
      title="Snippets"
      icon={Code}
      loading={loading}
      href="/admin/snippets"
      footer={
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1 text-warning/80">
            <Star className="w-3 h-3" fill="currentColor" /> {summary.favorites}{" "}
            starred
          </span>
          <span className="inline-flex items-center gap-1">
            <Code className="w-3 h-3" /> {summary.languageCount} langs
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={summary.total} label="reusable code snippets" />
        {summary.spotlight ? (
          <WidgetHighlight
            icon={Code}
            text={summary.spotlight.payload.title}
            subtext={summary.spotlight.payload.language}
          />
        ) : (
          <WidgetHighlight icon={Code} text="No snippets yet" />
        )}
      </div>
    </WidgetCard>
  );
}
