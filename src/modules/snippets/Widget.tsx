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
    const favorites = snippets.filter((s) => s.payload.is_favorite).length;
    const languages = new Set(snippets.map((s) => s.payload.language));
    return { total: snippets.length, favorites, languageCount: languages.size };
  }, [snippets]);

  return (
    <WidgetCard
      title="Snippets"
      icon={Code}
      loading={loading}
      href="/admin/snippets"
      footer={
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {summary.languageCount} language{summary.languageCount !== 1 ? "s" : ""}
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={summary.total} label="code snippets" />
        <WidgetHighlight
          icon={Star}
          text={
            summary.favorites > 0
              ? `${summary.favorites} starred across ${summary.languageCount} languages`
              : `${summary.languageCount} languages collected`
          }
        />
      </div>
    </WidgetCard>
  );
}
