"use client";

import { useState, useEffect } from "react";
import { Code, Star } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface SnippetSummary {
  total: number;
  favorites: number;
  languageCount: number;
}

const EMPTY_SUMMARY: SnippetSummary = {
  total: 0,
  favorites: 0,
  languageCount: 0,
};

export default function SnippetsWidget() {
  const [summary, setSummary] = useState<SnippetSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/widgets/summary?module_type=snippet", {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setSummary(data.data || EMPTY_SUMMARY))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const highlight =
    summary.total === 0
      ? {
          text: "No snippets yet",
          subtext: "Save reusable code as you go",
          variant: "default" as const,
        }
      : summary.favorites > 0
        ? {
            text: `${summary.favorites} starred across ${summary.languageCount} languages`,
            subtext: "Favorites stay easy to find",
            variant: "accent" as const,
          }
        : {
            text: `${summary.languageCount} languages collected`,
            subtext: "Star key snippets for faster recall",
            variant: "default" as const,
          };

  return (
    <WidgetCard
      title="Snippets"
      icon={Code}
      loading={loading}
      href="/admin/snippets"
    >
      <div className="space-y-3">
        <WidgetStat value={summary.total} label="code snippets" />
        <WidgetHighlight
          icon={Star}
          text={highlight.text}
          subtext={highlight.subtext}
          variant={highlight.variant}
        />
      </div>
    </WidgetCard>
  );
}
