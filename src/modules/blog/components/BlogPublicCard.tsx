"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { motion } from "framer-motion";
import { BlogPost } from "@/modules/blog/types";
import {
  estimateReadingTime,
  formatPostDate,
  getExcerpt,
} from "@/modules/blog/utils";

interface BlogPublicCardProps {
  post: BlogPost;
}

export default function BlogPublicCard({ post }: BlogPublicCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link href={`/blog/${post.payload.slug}`} className="group block h-full">
        <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/45 transition-colors hover:border-zinc-700">
          {post.payload.cover_image_url && (
            <div className="border-b border-zinc-800 bg-zinc-950/70">
              <img
                src={post.payload.cover_image_url}
                alt={post.payload.title}
                className="h-40 w-full object-cover opacity-80"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col p-5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span>
                {formatPostDate(post.payload.published_at || post.created_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {post.payload.estimated_reading_time ||
                  estimateReadingTime(post.payload.content)}{" "}
                min read
              </span>
            </div>

            <h3 className="mt-3 line-clamp-2 text-lg font-medium text-zinc-100 transition-colors group-hover:text-accent">
              {post.payload.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
              {post.payload.seo_description ||
                getExcerpt(post.payload.content, 140)}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {post.payload.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
