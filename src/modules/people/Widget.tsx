"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, Heart, Cake, Clock, Activity } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

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
    const controller = new AbortController();
    fetch("/api/content?module_type=person", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setPeople(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const total = people.length;
    const favorites = people.filter((p) => p.payload.is_favorite).length;

    // Stale: > 90 days
    const staleCount = people.filter((p) => {
      if (!p.payload.last_contacted) return true;
      const last = new Date(p.payload.last_contacted);
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      return (now - last.getTime()) / (1000 * 60 * 60 * 24) > 90;
    }).length;

    const health =
      total === 0 ? 0 : Math.round(((total - staleCount) / total) * 100);

    // Next Birthday
    const nextBirthday = people
      .filter((p) => p.payload.birthday)
      .sort((a, b) => {
        const ad = new Date(a.payload.birthday!).setFullYear(2000);
        const bd = new Date(b.payload.birthday!).setFullYear(2000);
        return ad - bd;
      })[0];

    return { total, favorites, health, nextBirthday, staleCount };
  }, [people]);

  return (
    <WidgetCard
      title="People"
      icon={Users}
      loading={loading}
      href="/admin/people"
      className="group"
      footer={
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          <span className="flex items-center gap-1.5 group-hover:text-pink-400 transition-colors">
            <Heart
              className="w-3 h-3"
              fill={stats.favorites > 0 ? "currentColor" : "none"}
            />{" "}
            {stats.favorites} VIPs
          </span>
          <span className="flex items-center gap-1.5 group-hover:text-accent transition-colors">
            <Activity className="w-3 h-3" /> {stats.health}% Health
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-zinc-50 tracking-tighter italic">
                {stats.total}
              </span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                Nodes
              </span>
            </div>
          </div>
          <div className="flex -space-x-2 pb-1">
            {[...Array(Math.min(stats.total, 3))].map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center"
              >
                <Users className="w-2.5 h-2.5 text-zinc-600" />
              </div>
            ))}
            {stats.total > 3 && (
              <div className="w-6 h-6 rounded-full bg-accent/20 border-2 border-zinc-950 flex items-center justify-center">
                <span className="text-[8px] font-bold text-accent">
                  +{stats.total - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {stats.staleCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-danger/5 border border-danger/10 rounded-2xl group/item hover:bg-danger/10 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-danger shadow-sm shadow-danger/20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-danger uppercase tracking-widest">
                  Latency Detected
                </p>
                <p className="text-[10px] text-zinc-500 font-medium truncate italic">
                  {stats.staleCount} entities requiring outreach
                </p>
              </div>
            </div>
          )}

          {stats.nextBirthday && (
            <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/10 rounded-2xl group/item hover:bg-accent/10 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Cake className="w-4 h-4 text-accent shadow-sm shadow-accent/20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-accent uppercase tracking-widest">
                  Next Milestone
                </p>
                <p className="text-[10px] text-zinc-500 font-medium truncate italic">
                  {stats.nextBirthday.payload.name}&apos;s birthday
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
