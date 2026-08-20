"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FileText,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import BlogPublicCard from "@/modules/blog/components/BlogPublicCard";
import { BlogPost } from "@/modules/blog/types";
import {
  buildBlogSummary,
  estimateReadingTime,
  formatPostDate,
  getExcerpt,
  getUniqueBlogTags,
  sortPostsByNewest,
} from "@/modules/blog/utils";

export default function BlogView({
  initialPosts,
}: {
  initialPosts: BlogPost[];
}) {
  const posts = useMemo(() => sortPostsByNewest(initialPosts), [initialPosts]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const summary = useMemo(() => buildBlogSummary(posts), [posts]);
  const allTags = useMemo(() => getUniqueBlogTags(posts), [posts]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.payload.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return counts;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesTag =
        tagFilter === "all" || post.payload.tags.includes(tagFilter);
      if (!matchesTag) return false;
      if (!search) return true;

      const haystack =
        `${post.payload.title} ${post.payload.seo_description || ""} ${post.payload.tags.join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [posts, query, tagFilter]);

  const featured = filteredPosts[0];
  const rest = filteredPosts.slice(1);
  const hasFilters = query.trim().length > 0 || tagFilter !== "all";

  return (
    <div className="flex-1 px-6 py-14 md:py-16">
      <div className="mx-auto max-w-6xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
          <div className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Journal
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">
              Writing that stays practical when life gets busy.
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Notes, breakdowns, and build logs from Life OS. Browse by topic,
              skim quickly, and jump straight to the posts worth your time.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:max-w-2xl">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                <p className="text-lg font-semibold text-zinc-100">
                  {summary.published}
                </p>
                <p className="text-xs text-zinc-500">Published posts</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                <p className="text-lg font-semibold text-zinc-100">
                  {summary.totalReadMinutes}
                </p>
                <p className="text-xs text-zinc-500">Minutes of reading</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                <p className="text-lg font-semibold text-zinc-100">
                  {allTags.length}
                </p>
                <p className="text-xs text-zinc-500">Topics covered</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              aria-label="Search posts"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search posts, tags, and keywords..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() => setTagFilter("all")}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
                  tagFilter === "all"
                    ? "border-accent/35 bg-accent/15 text-accent"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-300",
                )}
              >
                All topics
              </button>
              {allTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
                    tagFilter === tag
                      ? "border-accent/35 bg-accent/15 text-accent"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-300",
                  )}
                >
                  {tag}
                  <span className="ml-1 text-zinc-500">
                    {tagCounts.get(tag) || 0}
                  </span>
                </button>
              ))}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setTagFilter("all");
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>
              {filteredPosts.length} result
              {filteredPosts.length !== 1 ? "s" : ""}
            </span>
            {tagFilter !== "all" && <span>Topic: {tagFilter}</span>}
            {query.trim() && <span>Search: “{query.trim()}”</span>}
          </div>
        </section>

        {posts.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>No published posts yet.</p>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {filteredPosts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-400"
                >
                  <p>No posts match the current search.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {featured && (
              <Link
                href={`/blog/${featured.payload.slug}`}
                className="group mb-6 block"
              >
                <article className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-accent/8">
                  {featured.payload.cover_image_url && (
                    <>
                      <img
                        src={featured.payload.cover_image_url}
                        alt={featured.payload.title}
                        className="h-64 w-full object-cover opacity-70 md:h-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
                    </>
                  )}

                  <div
                    className={cn(
                      "relative p-6 md:p-8",
                      !featured.payload.cover_image_url &&
                        "bg-gradient-to-br from-zinc-900 to-zinc-950",
                    )}
                  >
                    <p className="mb-3 text-xs uppercase tracking-widest text-accent">
                      Featured
                    </p>
                    <h2 className="max-w-3xl text-2xl font-semibold text-zinc-100 transition-colors group-hover:text-accent md:text-3xl">
                      {featured.payload.title}
                    </h2>
                    <p className="mt-3 max-w-3xl line-clamp-3 text-zinc-300">
                      {featured.payload.seo_description ||
                        getExcerpt(featured.payload.content, 220)}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                      <span>
                        {formatPostDate(
                          featured.payload.published_at || featured.created_at,
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {featured.payload.estimated_reading_time ||
                          estimateReadingTime(featured.payload.content)}{" "}
                        min read
                      </span>
                      {featured.payload.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm text-accent">
                      Read post
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {rest.length > 0 && (
              <motion.div
                layout
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {rest.map((post) => (
                  <BlogPublicCard key={post._id} post={post} />
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
