"use client";

import {
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import { BlogPost, PostStatus } from "@/modules/blog/types";
import { estimateReadingTime, formatPostDate } from "@/modules/blog/utils";

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "bg-warning/15 text-warning",
  published: "bg-success/15 text-success",
  archived: "bg-zinc-500/15 text-zinc-400",
};

interface BlogPostGridProps {
  posts: BlogPost[];
  loading: boolean;
  isDeletingId: string | null;
  isTogglingStatusId: string | null;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (post: BlogPost) => void;
}

function BlogPostGrid({
  posts,
  loading,
  isDeletingId,
  isTogglingStatusId,
  onDelete,
  onEdit,
  onToggleStatus,
}: BlogPostGridProps) {
  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <SkeletonBlock className="h-4 w-2/3 rounded" />
            <SkeletonBlock className="mt-3 h-3 w-1/2 rounded" />
            <div className="mt-4 flex gap-2">
              <SkeletonBlock className="h-5 w-12 rounded-full" />
              <SkeletonBlock className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-12 text-center text-zinc-500">
        <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p>No posts match the current filters.</p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      transition={{ staggerChildren: 0.03 }}
    >
      {posts.map((post) => (
        <motion.article
          key={post._id}
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {post.payload.title}
                </p>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    STATUS_STYLES[post.payload.status],
                  )}
                >
                  {post.payload.status}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span className="font-mono">/{post.payload.slug}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {post.payload.estimated_reading_time ||
                    estimateReadingTime(post.payload.content)}{" "}
                  min
                </span>
                <span>
                  {formatPostDate(post.payload.published_at || post.created_at)}
                </span>
              </div>

              {post.payload.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.payload.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
              <button
                onClick={() => onToggleStatus(post)}
                disabled={isTogglingStatusId === post._id}
                aria-label={
                  post.payload.status === "published"
                    ? "Archive post"
                    : "Publish post"
                }
                title={
                  post.payload.status === "published"
                    ? "Archive post"
                    : "Publish post"
                }
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
              >
                {isTogglingStatusId === post._id ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : post.payload.status === "published" ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => onEdit(post)}
                disabled={
                  isDeletingId === post._id || isTogglingStatusId === post._id
                }
                aria-label="Edit post"
                title="Edit post"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(post._id)}
                disabled={isDeletingId === post._id}
                aria-label="Delete post"
                title="Delete post"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-danger disabled:opacity-50"
              >
                {isDeletingId === post._id ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.article>
      ))}
    </motion.div>
  );
}

export default memo(BlogPostGrid);
