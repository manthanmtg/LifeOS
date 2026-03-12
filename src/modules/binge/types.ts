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

export const STATUSES = ["to_watch", "watching", "completed", "dropped"] as const;
export const TYPES = ["movie", "series", "documentary", "anime"] as const;

export const STATUS_LABELS: Record<string, string> = {
    to_watch: "To Watch",
    watching: "Watching",
    completed: "Completed",
    dropped: "Dropped",
};

export const STATUS_STYLES: Record<string, string> = {
    to_watch: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    watching: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
    completed: "bg-green-500/15 text-green-300 border-green-500/25",
    dropped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

export const TYPE_LABELS: Record<string, string> = {
    movie: "Movie",
    series: "Series",
    documentary: "Documentary",
    anime: "Anime",
};

export const TYPE_STYLES: Record<string, string> = {
    movie: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    series: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    documentary: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    anime: "bg-pink-500/15 text-pink-300 border-pink-500/25",
};
