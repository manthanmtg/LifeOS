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
  const date = new Date(dateStr);
  const diffMs = nowMs - date.getTime();
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
  const total = items.length;
  const watching = items.filter((i) => i.payload.status === "watching").length;
  const completed = items.filter(
    (i) => i.payload.status === "completed",
  ).length;
  const toWatch = items.filter((i) => i.payload.status === "to_watch").length;
  const dropped = items.filter((i) => i.payload.status === "dropped").length;
  const rated = items.filter((i) => !!i.payload.rating);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, i) => sum + (i.payload.rating || 0), 0) /
        rated.length
      : 0;

  const movies = items.filter((i) => i.payload.type === "movie").length;
  const series = items.filter((i) => i.payload.type === "series").length;
  const anime = items.filter((i) => i.payload.type === "anime").length;
  const docs = items.filter((i) => i.payload.type === "documentary").length;

  const monthlyData: number[] = [];
  const completionData: number[] = [];
  for (let m = 5; m >= 0; m--) {
    if (!monthAnchor) {
      monthlyData.push(0);
      completionData.push(0);
      continue;
    }

    const start = new Date(
      monthAnchor.getFullYear(),
      monthAnchor.getMonth() - m,
      1,
    );
    const end = new Date(
      monthAnchor.getFullYear(),
      monthAnchor.getMonth() - m + 1,
      1,
    );
    const monthlyItems = items.filter((i) => {
      const d = new Date(i.created_at);
      return d >= start && d < end;
    });

    monthlyData.push(monthlyItems.length);
    completionData.push(
      monthlyItems.filter((i) => i.payload.status === "completed").length,
    );
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
