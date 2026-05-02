"use client";

import { memo, useState, useEffect } from "react";
import { Presentation } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import { FORMAT_LABELS } from "./types";

interface DeckSummary {
  total: number;
  publicDecks: number;
  uniqueTopics: number;
  latest: {
    payload: {
      title: string;
      format: string;
    };
    created_at: string;
  } | null;
}

const SlidesWidget = memo(function SlidesWidget() {
  const [summary, setSummary] = useState<DeckSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/widgets/summary?module_type=deck", { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => setSummary(data.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <WidgetCard
      title="Slides"
      icon={Presentation}
      loading={loading}
      href="/admin/slides"
    >
      <div className="space-y-3">
        <WidgetStat value={summary?.total ?? 0} label="decks uploaded" />
        {summary?.latest ? (
          <WidgetHighlight
            icon={Presentation}
            text={summary.latest.payload.title}
            subtext={`Latest • ${FORMAT_LABELS[summary.latest.payload.format] || summary.latest.payload.format.toUpperCase()}`}
          />
        ) : (
          <WidgetHighlight icon={Presentation} text="No decks yet" />
        )}
      </div>
    </WidgetCard>
  );
});

export default SlidesWidget;
