"use client";

import { useMemo, useState, useEffect } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface Idea {
  payload: {
    title: string;
    status: string;
    priority: string;
    promoted_to_portfolio?: boolean;
  };
}

export default function IdeasWidget() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=idea")
      .then((r) => r.json())
      .then((data) => setIdeas(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = ideas.length;
    const promoted = ideas.filter(
      (idea) => idea.payload.promoted_to_portfolio,
    ).length;
    const exploring = ideas.filter(
      (idea) => idea.payload.status === "exploring",
    ).length;
    return { total, promoted, exploring };
  }, [ideas]);

  const topIdea = useMemo(() => {
    const highPriority = ideas.filter(
      (idea) =>
        idea.payload.priority === "high" && idea.payload.status !== "archived",
    );
    const exploring = ideas.filter(
      (idea) => idea.payload.status === "exploring",
    );
    const raw = ideas.filter((idea) => idea.payload.status === "raw");
    return highPriority[0] || exploring[0] || raw[0];
  }, [ideas]);

  return (
    <WidgetCard
      title="Ideas"
      icon={Lightbulb}
      loading={loading}
      href="/admin/ideas"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5 text-success">
            <Sparkles className="w-3 h-3" /> {stats.promoted} promoted
          </span>
          <span>{stats.exploring} exploring</span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={stats.total} label="captured concepts" />
        {topIdea ? (
          <WidgetHighlight
            icon={Lightbulb}
            text={topIdea.payload.title}
            subtext={topIdea.payload.status}
          />
        ) : (
          <WidgetHighlight icon={Lightbulb} text="No ideas yet" />
        )}
      </div>
    </WidgetCard>
  );
}
