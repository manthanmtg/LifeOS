export interface BingeItem {
  _id: string;
  created_at: string;
  payload: {
    title: string;
    type: "movie" | "series" | "documentary" | "anime";
    status: "to_watch" | "watching" | "completed" | "dropped";
    rating?: number;
    notes?: string;
    genre?: string;
    platform?: string;
    year?: number;
    poster_url?: string;
    recommended_by?: string;
    rewatched: boolean;
    rewatch_count: number;
    // Series only
    current_season?: number;
    current_episode?: number;
    total_seasons?: number;
  };
}

export const STATUSES = [
  "to_watch",
  "watching",
  "completed",
  "dropped",
] as const;
export const TYPES = ["movie", "series", "documentary", "anime"] as const;

export const STATUS_LABELS: Record<string, string> = {
  to_watch: "To Watch",
  watching: "Watching",
  completed: "Completed",
  dropped: "Dropped",
};

export const STATUS_STYLES: Record<string, string> = {
  to_watch: "bg-accent/15 text-accent border-accent/25",
  watching: "bg-warning/15 text-warning border-warning/25",
  completed: "bg-success/15 text-success border-success/25",
  dropped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

export const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  series: "Series",
  documentary: "Documentary",
  anime: "Anime",
};

export const TYPE_STYLES: Record<string, string> = {
  movie: "bg-accent/15 text-accent border-accent/25",
  series: "bg-success/15 text-success border-success/25",
  documentary: "bg-warning/15 text-warning border-warning/25",
  anime: "bg-danger/15 text-danger border-danger/25",
};
