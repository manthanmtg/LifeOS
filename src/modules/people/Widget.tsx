"use client";

import { useState, useEffect } from "react";
import { Users, Clock, AlertTriangle, Activity } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface PeopleSummary {
  total: number;
  staleCount: number;
  recentlyContactedCount: number;
  favorites: number;
  upcomingBirthdaysCount: number;
  healthScore: number;
}

const EMPTY_SUMMARY: PeopleSummary = {
  total: 0,
  staleCount: 0,
  recentlyContactedCount: 0,
  favorites: 0,
  upcomingBirthdaysCount: 0,
  healthScore: 0,
};

export default function PeopleWidget() {
  const [summary, setSummary] = useState<PeopleSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let active = true;

    fetch("/api/widgets/summary?module_type=person", { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load people summary");
        return r.json();
      })
      .then((data) => {
        if (active) {
          setLoadError(false);
          setSummary(data?.data || EMPTY_SUMMARY);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
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
      <div className="space-y-3">
        <WidgetStat value={summary.total} label="people you know" />
        {loadError ? (
          <WidgetHighlight
            icon={AlertTriangle}
            text="People summary unavailable"
            subtext="Open People to refresh this card"
            variant="danger"
          />
        ) : summary.total === 0 ? (
          <WidgetHighlight
            icon={Users}
            text="No one here yet"
            subtext="Add a person to begin building your network"
            variant="accent"
          />
        ) : summary.staleCount > 0 ? (
          <WidgetHighlight
            icon={Clock}
            text={`${summary.staleCount} to catch up with`}
            subtext="Open People to plan the next check-in"
            variant="warning"
          />
        ) : (
          <WidgetHighlight
            icon={Activity}
            text={`Network health: ${summary.healthScore}%`}
            subtext={`${summary.recentlyContactedCount} contacts in last 14 days`}
            variant={
              summary.healthScore >= 85
                ? "success"
                : summary.healthScore >= 60
                  ? "warning"
                  : "danger"
            }
          />
        )}
      </div>
    </WidgetCard>
  );
}
