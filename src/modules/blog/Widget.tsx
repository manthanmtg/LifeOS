"use client";

import { useEffect, useState } from "react";
import { FileText, PenLine, Sparkles } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetHighlight,
  WidgetStat,
} from "@/components/dashboard/widget-primitives";
import { BlogSummary } from "@/modules/blog/types";

const EMPTY_SUMMARY: BlogSummary = {
  total: 0,
  published: 0,
  drafts: 0,
  archived: 0,
  totalReadMinutes: 0,
  latestPublishedPost: null,
};

export default function BlogWidget() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<BlogSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/widgets/summary?module_type=blog_post", {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => setSummary(payload.data || EMPTY_SUMMARY))
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <WidgetCard
        title="Blog"
        icon={Sparkles}
        loading={loading}
        href="/admin/blog"
      >
        <div className="space-y-3">
          <div className="h-11 rounded-xl bg-zinc-200/60 dark:bg-zinc-700/60 animate-pulse" />
          <div className="h-16 rounded-xl bg-zinc-200/60 dark:bg-zinc-700/60 animate-pulse" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Blog"
      icon={Sparkles}
      loading={loading}
      href="/admin/blog"
    >
      <div className="space-y-3">
        <WidgetStat
          value={summary.published}
          label={`published · ${summary.totalReadMinutes}m total read time`}
        />
        {summary.latestPublishedPost ? (
          <WidgetHighlight
            icon={FileText}
            text={summary.latestPublishedPost.title}
            subtext={`${summary.latestPublishedPost.readingTime} min read`}
            variant="accent"
          />
        ) : summary.drafts > 0 ? (
          <WidgetHighlight
            icon={PenLine}
            text={`${summary.drafts} draft${summary.drafts !== 1 ? "s" : ""} ready to shape`}
            subtext="Publish queue"
            variant="warning"
          />
        ) : (
          <WidgetHighlight
            icon={FileText}
            text={summary.archived > 0 ? `${summary.archived} archived post${summary.archived !== 1 ? "s" : ""}` : "No posts yet"}
            subtext={summary.archived > 0 ? "Consider republishing from archive" : "Draft your first post"}
            variant="default"
          />
        )}
      </div>
    </WidgetCard>
  );
}
