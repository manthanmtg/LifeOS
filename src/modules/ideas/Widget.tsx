"use client";

import { useState, useEffect } from "react";
import { Lightbulb, AlertTriangle, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface IdeaSummary {
  total: number;
  reviewCount: number;
  promoted: number;
  exploring: number;
  spotlightTitle?: string;
  spotlightStatus?: string;
}

export default function IdeasWidget() {
  const [summary, setSummary] = useState<IdeaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();

    fetch("/api/widgets/summary?module_type=idea", { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => setSummary(data.data || null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const totalIdeas = summary?.total ?? 0;
  const reviewCount = summary?.reviewCount ?? 0;
  const promotedCount = summary?.promoted ?? 0;
  const exploringCount = summary?.exploring ?? 0;
  const spotlightTitle = summary?.spotlightTitle ?? "No spotlight idea yet";
  const spotlightStatus = summary?.spotlightStatus;
  const hasIdeas = totalIdeas > 0;

  const detailText =
    loadError
      ? "Idea metrics unavailable"
      : hasIdeas && reviewCount > 0
        ? `${reviewCount} ideas need review`
        : hasIdeas
          ? exploringCount > 0
            ? `${exploringCount} ideas are exploring`
            : "Review queue is clear."
          : "No ideas yet";

  const detailSubtext = loadError
    ? "Open Ideas to retry"
    : hasIdeas
      ? `Latest focus: ${spotlightTitle}${spotlightStatus ? ` · ${spotlightStatus}` : ""}`
      : "A single idea capture makes momentum";

  const detailIcon = loadError
    ? AlertTriangle
    : reviewCount > 0
      ? CheckCheck
      : Lightbulb;

  const detailVariant =
    loadError || (!hasIdeas && !loadError)
      ? "warning"
      : reviewCount
        ? "warning"
        : promotedCount > 0
          ? "success"
          : "accent";

  return (
    <WidgetCard
      title="Ideas"
      icon={Lightbulb}
      loading={loading}
      href="/admin/ideas"
    >
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <WidgetStat
          value={totalIdeas}
          label="captured ideas"
        />
        <WidgetHighlight
          icon={detailIcon}
          text={loadError ? detailText : detailText || "Preparing your idea board"}
          subtext={loadError ? detailSubtext : detailSubtext}
          variant={detailVariant}
        />
      </motion.div>
    </WidgetCard>
  );
}
