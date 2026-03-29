"use client";

import { useState, useEffect } from "react";
import { FileText, PenLine, Sparkles } from "lucide-react";
import { BlogPost } from "@/modules/blog/types";
import { estimateReadingTime } from "@/modules/blog/utils";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

export default function BlogWidget() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=blog_post")
      .then((r) => r.json())
      .then((d) => setPosts(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const published = posts.filter((p) => p.payload.status === "published");
  const drafts = posts.filter((p) => p.payload.status === "draft");
  const totalMinutes = published.reduce(
    (sum, post) =>
      sum +
      (post.payload.estimated_reading_time ||
        estimateReadingTime(post.payload.content)),
    0,
  );
  const latest = [...published].sort(
    (a, b) =>
      new Date(b.payload.published_at || b.created_at).getTime() -
      new Date(a.payload.published_at || a.created_at).getTime(),
  )[0];

  return (
    <WidgetCard
      title="Blog"
      icon={Sparkles}
      loading={loading}
      href="/admin/blog"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          {drafts.length > 0 ? (
            <span className="flex items-center gap-1 text-warning">
              <PenLine className="w-3 h-3" /> {drafts.length} draft
              {drafts.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-zinc-500">No drafts</span>
          )}
          <span className="text-zinc-500 inline-flex items-center gap-1">
            <FileText className="w-3 h-3" /> {posts.length} total
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat
          value={published.length}
          label={`published · ${totalMinutes} min read`}
        />
        {latest ? (
          <WidgetHighlight
            icon={FileText}
            text={latest.payload.title}
            subtext={`${latest.payload.estimated_reading_time || estimateReadingTime(latest.payload.content)} min read`}
          />
        ) : (
          <WidgetHighlight icon={FileText} text="No published posts yet" />
        )}
      </div>
    </WidgetCard>
  );
}
