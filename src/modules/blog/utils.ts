import { BlogPost, BlogSummary } from "@/modules/blog/types";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function estimateReadingTime(content: string): number {
  const words = wordCount(content);
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 200));
}

export function parseTagInput(tagsInput: string): string[] {
  return tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export function formatPostDate(value?: string): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getExcerpt(content: string, maxLength = 180): string {
  const plain = stripMarkdown(content);
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trim()}...`;
}

export function headingToId(text: string): string {
  return slugify(
    text
      .replace(/[`*_~[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function getPostTimestamp(post: BlogPost): number {
  return new Date(post.payload.published_at || post.created_at).getTime();
}

export function sortPostsByNewest<T extends BlogPost>(posts: T[]): T[] {
  return [...posts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
}

export function getUniqueBlogTags(posts: BlogPost[]): string[] {
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.payload.tags || []) {
      if (tag.trim()) tags.add(tag.trim());
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function buildBlogSummary(posts: BlogPost[]): BlogSummary {
  const publishedPosts = posts.filter(
    (post) => post.payload.status === "published",
  );
  const latestPublished = sortPostsByNewest(publishedPosts)[0];

  return {
    total: posts.length,
    published: publishedPosts.length,
    drafts: posts.filter((post) => post.payload.status === "draft").length,
    archived: posts.filter((post) => post.payload.status === "archived").length,
    totalReadMinutes: publishedPosts.reduce(
      (sum, post) =>
        sum +
        (post.payload.estimated_reading_time ||
          estimateReadingTime(post.payload.content)),
      0,
    ),
    latestPublishedPost: latestPublished
      ? {
          title: latestPublished.payload.title,
          readingTime:
            latestPublished.payload.estimated_reading_time ||
            estimateReadingTime(latestPublished.payload.content),
        }
      : null,
  };
}
