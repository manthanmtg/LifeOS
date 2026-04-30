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

  return (
    <WidgetCard
      title="Blog"
      icon={Sparkles}
      loading={loading}
      href="/admin/blog"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          {summary.drafts > 0 ? (
            <span className="flex items-center gap-1 text-warning">
              <PenLine className="h-3 w-3" />
              {summary.drafts} draft{summary.drafts !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-zinc-500">No drafts</span>
          )}
          <span className="inline-flex items-center gap-1 text-zinc-500">
            <FileText className="h-3 w-3" />
            {summary.total} total
          </span>
        </div>
      }
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
          <WidgetHighlight icon={FileText} text="No posts yet" />
        )}
      </div>
    </WidgetCard>
  );
}
