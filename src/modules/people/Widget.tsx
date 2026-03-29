"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, Heart, Clock, Activity } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

const NOW_MS = Date.now();

interface Person {
  payload: {
    name: string;
    birthday?: string;
    last_contacted?: string;
    is_favorite?: boolean;
    relationship: string;
  };
}

export default function PeopleWidget() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/content?module_type=person", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setPeople(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const stats = useMemo(() => {
    const total = people.length;
    const favorites = people.filter((p) => p.payload.is_favorite).length;
    const staleCount = people.filter((p) => {
      if (!p.payload.last_contacted) return true;
      const last = new Date(p.payload.last_contacted);
      return (NOW_MS - last.getTime()) / (1000 * 60 * 60 * 24) > 90;
    }).length;
    const health =
      total === 0 ? 0 : Math.round(((total - staleCount) / total) * 100);
    return { total, favorites, staleCount, health };
  }, [people]);

  return (
    <WidgetCard
      title="People"
      icon={Users}
      loading={loading}
      href="/admin/people"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-accent/80">
            <Heart className="w-3 h-3" /> {stats.favorites} favorites
          </span>
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Activity className="w-3 h-3" /> {stats.health}% health
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={stats.total} label="people you know" />
        {stats.staleCount > 0 ? (
          <WidgetHighlight
            icon={Clock}
            text={`${stats.staleCount} to catch up with`}
            subtext="Haven't talked in 90+ days"
            variant="warning"
          />
        ) : (
          <WidgetHighlight
            icon={Users}
            text="Everyone's in touch"
            variant="success"
          />
        )}
      </div>
    </WidgetCard>
  );
}
