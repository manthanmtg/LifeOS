import type { BingeItem } from "../types";

interface BingeStats {
  total: number;
  watching: number;
  completed: number;
  toWatch: number;
  dropped: number;
  avgRating: number;
  movies: number;
  series: number;
  anime: number;
  docs: number;
  monthlyData: number[];
  completionData: number[];
}

export function formatRelativeDate(dateStr: string, nowMs: number): string {
  const dateMs = Date.parse(dateStr);
  if (!Number.isFinite(dateMs)) return "—";

  const diffMs = nowMs - dateMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function buildBingeStats(
  items: BingeItem[],
  monthAnchor: Date | null,
): BingeStats {
  const anchorYear = monthAnchor?.getUTCFullYear();
  const anchorMonth = monthAnchor?.getUTCMonth();

  const total = items.length;
  let watching = 0;
  let completed = 0;
  let toWatch = 0;
  let dropped = 0;
  let ratingSum = 0;
  let ratedCount = 0;
  let movies = 0;
  let series = 0;
  let anime = 0;
  let docs = 0;

  for (const item of items) {
    if (item.payload.status === "watching") watching += 1;
    else if (item.payload.status === "completed") completed += 1;
    else if (item.payload.status === "to_watch") toWatch += 1;
    else if (item.payload.status === "dropped") dropped += 1;

    if (item.payload.type === "movie") movies += 1;
    else if (item.payload.type === "series") series += 1;
    else if (item.payload.type === "anime") anime += 1;
    else if (item.payload.type === "documentary") docs += 1;

    if (item.payload.rating) {
      ratingSum += item.payload.rating;
      ratedCount += 1;
    }
  }

  const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;

  const monthlyData: number[] = [];
  const completionData: number[] = [];

  if (!monthAnchor) {
    for (let m = 0; m < 6; m++) {
      monthlyData.push(0);
      completionData.push(0);
    }
  } else {
    const monthBuckets: number[] = Array.from({ length: 6 }, () => 0);
    const completedMonthBuckets: number[] = Array.from({ length: 6 }, () => 0);

    for (const item of items) {
      const createdAtMs = Date.parse(item.created_at);
      if (!Number.isFinite(createdAtMs)) continue;

      const itemDate = new Date(createdAtMs);
      const monthDiff =
        (anchorYear! - itemDate.getUTCFullYear()) * 12 +
        (anchorMonth! - itemDate.getUTCMonth());
      if (monthDiff < 0 || monthDiff >= 6) continue;

      const idx = 5 - monthDiff;
      monthBuckets[idx] += 1;

      if (item.payload.status === "completed") {
        completedMonthBuckets[idx] += 1;
      }
    }

    monthlyData.push(...monthBuckets);
    completionData.push(...completedMonthBuckets);
  }

  return {
    total,
    watching,
    completed,
    toWatch,
    dropped,
    avgRating,
    movies,
    series,
    anime,
    docs,
    monthlyData,
    completionData,
  };
}
