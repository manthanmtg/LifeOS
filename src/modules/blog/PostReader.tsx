"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import MarkdownPreview from "@/modules/blog/MarkdownPreview";
import BlogReaderOutline from "@/modules/blog/components/BlogReaderOutline";
import { BlogHeading, BlogPost } from "@/modules/blog/types";
import {
  estimateReadingTime,
  formatPostDate,
  getExcerpt,
  headingToId,
} from "@/modules/blog/utils";

interface Props {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

function getScrollContainer(element: HTMLElement): Window | HTMLElement {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const styles = window.getComputedStyle(current);
    const overflowY = styles.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return window;
}

function isElementScrollContainer(
  container: Window | HTMLElement | null,
): container is HTMLElement {
  return container !== null && container !== window;
}

function outlinesEqual(a: BlogHeading[], b: BlogHeading[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].id !== b[i].id ||
      a[i].text !== b[i].text ||
      a[i].level !== b[i].level
    ) {
      return false;
    }
  }
  return true;
}

export default function PostReader({ post, relatedPosts }: Props) {
  const articleRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<Window | HTMLElement | null>(null);
  const [headings, setHeadings] = useState<BlogHeading[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);

  const publishedDate = formatPostDate(
    post.payload.published_at || post.created_at,
  );

  useEffect(() => {
    const collectHeadings = () => {
      const article = articleRef.current;
      if (!article) {
        setHeadings([]);
        setActiveHeading("");
        return;
      }

      scrollContainerRef.current = getScrollContainer(article);

      const nodes = Array.from(article.querySelectorAll("h2, h3"));
      const idCounts = new Map<string, number>();
      const outline: BlogHeading[] = nodes
        .map((node, index) => {
          const text = node.textContent?.trim() || "";
          if (!text) return null;
          const baseId = headingToId(text) || `section-${index + 1}`;
          const count = (idCounts.get(baseId) || 0) + 1;
          idCounts.set(baseId, count);
          const id = count === 1 ? baseId : `${baseId}-${count}`;
          if (node.getAttribute("id") !== id) {
            node.setAttribute("id", id);
          }
          return {
            id,
            text,
            level: node.tagName === "H2" ? 2 : 3,
          } as BlogHeading;
        })
        .filter((item): item is BlogHeading => item !== null);

      setHeadings((previous) =>
        outlinesEqual(previous, outline) ? previous : outline,
      );
      setActiveHeading((previous) => {
        if (previous && outline.some((item) => item.id === previous)) {
          return previous;
        }
        return outline[0]?.id || "";
      });
    };

    const article = articleRef.current;
    if (!article) return;

    const raf1 = window.requestAnimationFrame(collectHeadings);
    const raf2 = window.requestAnimationFrame(collectHeadings);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [post.payload.content]);

  useEffect(() => {
    const getContainerMetrics = () => {
      const container = scrollContainerRef.current;
      if (!isElementScrollContainer(container)) {
        return { top: 0, height: window.innerHeight };
      }

      const rect = container.getBoundingClientRect();
      return { top: rect.top, height: container.clientHeight };
    };

    const onScroll = () => {
      const article = articleRef.current;
      if (!article) return;

      const metrics = getContainerMetrics();
      const rect = article.getBoundingClientRect();
      const articleTop = rect.top - metrics.top;
      const offset = metrics.height * 0.2;
      const total = Math.max(1, rect.height - metrics.height * 0.4);
      const consumed = Math.min(total, Math.max(0, offset - articleTop));
      setProgress(
        Math.max(0, Math.min(100, Math.round((consumed / total) * 100))),
      );

      let current = headings[0]?.id ?? "";
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        const headingTop = element.getBoundingClientRect().top - metrics.top;
        if (headingTop <= 120) current = heading.id;
      }
      setActiveHeading((previous) =>
        previous === current ? previous : current,
      );
    };

    onScroll();
    const container = scrollContainerRef.current;
    if (!isElementScrollContainer(container)) {
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    const container = scrollContainerRef.current;
    if (!isElementScrollContainer(container)) {
      const top = target.getBoundingClientRect().top + window.scrollY - 104;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      const containerRect = container.getBoundingClientRect();
      const targetTop =
        target.getBoundingClientRect().top -
        containerRect.top +
        container.scrollTop -
        88;
      container.scrollTo({ top: targetTop, behavior: "smooth" });
    }

    window.history.replaceState(null, "", `#${id}`);
    setActiveHeading(id);
    setMobileOutlineOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="flex-1 pb-16">
      <div className="sticky top-0 z-30 h-1 bg-zinc-900/80 backdrop-blur">
        <div
          className="h-full bg-accent transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-6 pt-10 md:pt-14">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            All posts
          </Link>

          <header className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-10">
            <div className="absolute -top-12 right-0 h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
            <div className="relative">
              {post.payload.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.payload.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-100 md:text-5xl">
                {post.payload.title}
              </h1>
              {post.payload.seo_description && (
                <p className="mt-4 max-w-3xl text-zinc-300">
                  {post.payload.seo_description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {publishedDate}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {post.payload.estimated_reading_time ||
                    estimateReadingTime(post.payload.content)}{" "}
                  min read
                </span>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-zinc-300"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          </header>

          {headings.length > 0 && (
            <div className="mb-6 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOutlineOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    On this page
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {activeHeading
                      ? headings.find((item) => item.id === activeHeading)?.text
                      : `${headings.length} sections`}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-zinc-500 transition-transform",
                    mobileOutlineOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {mobileOutlineOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <BlogReaderOutline
                        activeHeading={activeHeading}
                        headings={headings}
                        onSelect={scrollToHeading}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {post.payload.cover_image_url && (
            <div className="mb-8 overflow-hidden rounded-3xl border border-zinc-800">
              <img
                src={post.payload.cover_image_url}
                alt={post.payload.title}
                className="h-64 w-full object-cover md:h-96"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
            <article
              ref={articleRef}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/35 p-6 md:p-10"
            >
              <MarkdownPreview content={post.payload.content} />
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
                    Reading progress
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-accent transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    {progress}% complete
                  </p>
                </div>

                {headings.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
                      On this page
                    </p>
                    <BlogReaderOutline
                      activeHeading={activeHeading}
                      headings={headings}
                      onSelect={scrollToHeading}
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>

          {relatedPosts.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Continue Reading
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    More recent posts from the same journal.
                  </p>
                </div>
                <Link
                  href="/blog"
                  className="text-sm text-accent transition-colors hover:text-accent-hover"
                >
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {relatedPosts.map((item) => (
                  <Link
                    key={item._id}
                    href={`/blog/${item.payload.slug}`}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700"
                  >
                    <p className="mb-2 text-xs text-zinc-500">
                      {formatPostDate(
                        item.payload.published_at || item.created_at,
                      )}
                    </p>
                    <h3 className="line-clamp-2 text-sm font-medium text-zinc-100 transition-colors group-hover:text-accent">
                      {item.payload.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs text-zinc-400">
                      {item.payload.seo_description ||
                        getExcerpt(item.payload.content, 120)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
