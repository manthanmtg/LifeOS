"use client";

import { useState, useEffect } from "react";
import { Users, Clock } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface PeopleSummary {
  total: number;
  staleCount: number;
}

export default function PeopleWidget() {
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    let active = true;

    fetch("/api/widgets/summary?module_type=person", { signal: ac.signal })
      .then((r) => (active ? r.json() : null))
      .then((data) => {
        if (active) setSummary(data?.data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      ac.abort();
    };
  }, []);

  return (
    <WidgetCard
      title="People"
      icon={Users}
      loading={loading}
      href="/admin/people"
    >
      {summary && (
        <div className="space-y-3">
          <WidgetStat value={summary.total} label="people you know" />
          {summary.staleCount > 0 ? (
            <WidgetHighlight
              icon={Clock}
              text={`${summary.staleCount} to catch up with`}
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
      )}
    </WidgetCard>
  );
}
