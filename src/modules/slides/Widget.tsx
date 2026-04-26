"use client";

import { useMemo, useState, useEffect } from "react";
import { Presentation, Globe, Layers } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";
import type { DeckItem } from "./types";

export default function SlidesWidget() {
  const [items, setItems] = useState<DeckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=deck")
      .then((res) => res.json())
      .then((data) => setItems(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const publicDecks = items.filter(
      (i) => i.payload.visibility === "public",
    ).length;
    const uniqueTopics = new Set(
      items.map((i) => i.payload.topic).filter(Boolean),
    ).size;
    const latest =
      items.length > 0
        ? items.reduce((a, b) =>
            new Date(b.created_at).getTime() > new Date(a.created_at).getTime()
              ? b
              : a,
          )
        : null;
    return { total: items.length, publicDecks, uniqueTopics, latest };
  }, [items]);

  return (
    <WidgetCard
      title="Slides"
      icon={Presentation}
      loading={loading}
      href="/admin/slides"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-success/80">
            <Globe className="w-3 h-3" /> {summary.publicDecks} public
          </span>
          <span className="flex items-center gap-1.5 text-accent/80">
            <Layers className="w-3 h-3" /> {summary.uniqueTopics} topics
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={summary.total} label="decks uploaded" />
        {summary.latest ? (
          <WidgetHighlight
            icon={Presentation}
            text={summary.latest.payload.title}
            subtext={`Latest • ${summary.latest.payload.format?.toUpperCase()}`}
          />
        ) : (
          <WidgetHighlight icon={Presentation} text="No decks yet" />
        )}
      </div>
    </WidgetCard>
  );
}
