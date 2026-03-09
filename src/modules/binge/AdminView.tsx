"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    Tv,
    Star,
    Search,
    RefreshCw,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    BingeItem,
    STATUSES,
    TYPES,
    STATUS_LABELS,
    STATUS_STYLES,
    TYPE_LABELS,
    TYPE_STYLES,
} from "./types";

export default function BingeAdminView() {
    const [items, setItems] = useState<BingeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [title, setTitle] = useState("");
    const [type, setType] = useState<string>("movie");
    const [status, setStatus] = useState<string>("to_watch");
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState("");
    const [genre, setGenre] = useState("");
    const [platform, setPlatform] = useState("");
    const [year, setYear] = useState("");
    const [posterUrl, setPosterUrl] = useState("");
    const [recommendedBy, setRecommendedBy] = useState("");
    const [rewatched, setRewatched] = useState(false);
    const [rewatchCount, setRewatchCount] = useState("");
    const [currentSeason, setCurrentSeason] = useState("");
    const [currentEpisode, setCurrentEpisode] = useState("");
    const [totalSeasons, setTotalSeasons] = useState("");
    const [formError, setFormError] = useState("");

    const fetchItems = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=binge_item");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch");
            setItems(data.data || []);
        } catch (err: unknown) {
            console.error("fetchItems failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const resetForm = () => {
        setTitle("");
        setType("movie");
        setStatus("to_watch");
        setRating(0);
        setNotes("");
        setGenre("");
        setPlatform("");
        setYear("");
        setPosterUrl("");
        setRecommendedBy("");
        setRewatched(false);
        setRewatchCount("");
        setCurrentSeason("");
        setCurrentEpisode("");
        setTotalSeasons("");
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError("");

        if (!title.trim()) {
            setFormError("Title is required");
            return;
        }

        const payload: Record<string, unknown> = {
            title: title.trim(),
            type,
            status,
            rating: rating || undefined,
            notes: notes.trim() || undefined,
            genre: genre.trim() || undefined,
            platform: platform.trim() || undefined,
            year: year ? Number.parseInt(year, 10) : undefined,
            poster_url: posterUrl.trim() || undefined,
            recommended_by: recommendedBy.trim() || undefined,
            rewatched,
            rewatch_count: rewatchCount ? Number.parseInt(rewatchCount, 10) : 0,
        };

        if (type === "series" || type === "anime") {
            if (currentSeason) payload.current_season = Number.parseInt(currentSeason, 10);
            if (currentEpisode) payload.current_episode = Number.parseInt(currentEpisode, 10);
            if (totalSeasons) payload.total_seasons = Number.parseInt(totalSeasons, 10);
        }

        setIsSubmitting(true);
        try {
            const res = editingId
                ? await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                })
                : await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "binge_item", is_public: false, payload }),
                });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            resetForm();
            await fetchItems();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (item: BingeItem) => {
        setTitle(item.payload.title);
        setType(item.payload.type);
        setStatus(item.payload.status);
        setRating(item.payload.rating || 0);
        setNotes(item.payload.notes || "");
        setGenre(item.payload.genre || "");
        setPlatform(item.payload.platform || "");
        setYear(item.payload.year?.toString() || "");
        setPosterUrl(item.payload.poster_url || "");
        setRecommendedBy(item.payload.recommended_by || "");
        setRewatched(item.payload.rewatched || false);
        setRewatchCount((item.payload.rewatch_count || 0).toString());
        setCurrentSeason(item.payload.current_season?.toString() || "");
        setCurrentEpisode(item.payload.current_episode?.toString() || "");
        setTotalSeasons(item.payload.total_seasons?.toString() || "");
        setEditingId(item._id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            await fetchItems();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setIsDeletingId(null);
        }
    };

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [items]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return sortedItems.filter((item) => {
            if (statusFilter !== "all" && item.payload.status !== statusFilter) return false;
            if (typeFilter !== "all" && item.payload.type !== typeFilter) return false;
            if (!query) return true;
            const haystack = `${item.payload.title} ${item.payload.genre || ""} ${item.payload.platform || ""}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [sortedItems, statusFilter, typeFilter, searchQuery]);

    const stats = useMemo(() => {
        const total = items.length;
        const watching = items.filter((i) => i.payload.status === "watching").length;
        const completed = items.filter((i) => i.payload.status === "completed").length;
        const rated = items.filter((i) => !!i.payload.rating);
        const avgRating = rated.length > 0
            ? rated.reduce((sum, i) => sum + (i.payload.rating || 0), 0) / rated.length
            : 0;
        return { total, watching, completed, avgRating };
    }, [items]);

    const isSeriesType = type === "series" || type === "anime";

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-purple-500/10 blur-3xl" />
                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Binge</h1>
                            <p className="text-zinc-400 mt-1">Track movies, series, documentaries, and anime — all in one place.</p>
                        </div>
                        <div className="flex items-center gap-2 md:pt-1">
                            <button
                                onClick={() => { resetForm(); setShowForm(true); }}
                                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Item
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Watching</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.watching}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Completed</p>
                            <p className="text-lg font-semibold text-green-300">{stats.completed}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Avg Rating</p>
                            <p className="text-lg font-semibold text-yellow-300">
                                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "Add"} Item</h2>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300" aria-label="Close form">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title */}
                        <div className="md:col-span-2">
                            <label htmlFor="binge-title" className="block text-xs text-zinc-500 mb-1.5">Title <span className="text-red-400">*</span></label>
                            <input
                                id="binge-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Movie or series title"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                autoFocus
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label htmlFor="binge-type" className="block text-xs text-zinc-500 mb-1.5">Type</label>
                            <select
                                id="binge-type"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            >
                                {TYPES.map((t) => (
                                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label htmlFor="binge-status" className="block text-xs text-zinc-500 mb-1.5">Status</label>
                            <select
                                id="binge-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            >
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Genre */}
                        <div>
                            <label htmlFor="binge-genre" className="block text-xs text-zinc-500 mb-1.5">Genre</label>
                            <input
                                id="binge-genre"
                                type="text"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                placeholder="Action, Comedy, Thriller…"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Platform */}
                        <div>
                            <label htmlFor="binge-platform" className="block text-xs text-zinc-500 mb-1.5">Platform</label>
                            <input
                                id="binge-platform"
                                type="text"
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                placeholder="Netflix, Prime, HBO…"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Year */}
                        <div>
                            <label htmlFor="binge-year" className="block text-xs text-zinc-500 mb-1.5">Year</label>
                            <input
                                id="binge-year"
                                type="number"
                                min={1900}
                                max={2100}
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="2024"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Poster URL */}
                        <div>
                            <label htmlFor="binge-poster" className="block text-xs text-zinc-500 mb-1.5">Poster URL</label>
                            <input
                                id="binge-poster"
                                type="url"
                                value={posterUrl}
                                onChange={(e) => setPosterUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Recommended By */}
                        <div>
                            <label htmlFor="binge-rec-by" className="block text-xs text-zinc-500 mb-1.5">Recommended By</label>
                            <input
                                id="binge-rec-by"
                                type="text"
                                value={recommendedBy}
                                onChange={(e) => setRecommendedBy(e.target.value)}
                                placeholder="Friend, Reddit…"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Series fields */}
                        {isSeriesType && (
                            <>
                                <div>
                                    <label htmlFor="binge-season" className="block text-xs text-zinc-500 mb-1.5">Current Season</label>
                                    <input
                                        id="binge-season"
                                        type="number"
                                        min={1}
                                        value={currentSeason}
                                        onChange={(e) => setCurrentSeason(e.target.value)}
                                        placeholder="1"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="binge-episode" className="block text-xs text-zinc-500 mb-1.5">Current Episode</label>
                                    <input
                                        id="binge-episode"
                                        type="number"
                                        min={1}
                                        value={currentEpisode}
                                        onChange={(e) => setCurrentEpisode(e.target.value)}
                                        placeholder="1"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="binge-total-seasons" className="block text-xs text-zinc-500 mb-1.5">Total Seasons</label>
                                    <input
                                        id="binge-total-seasons"
                                        type="number"
                                        min={1}
                                        value={totalSeasons}
                                        onChange={(e) => setTotalSeasons(e.target.value)}
                                        placeholder="Optional"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </>
                        )}

                        {/* Rating (1-10) */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Rating (1–10)</label>
                            <div className="flex items-center gap-1 flex-wrap">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setRating(n === rating ? 0 : n)}
                                        disabled={isSubmitting}
                                        aria-label={`Rate ${n}`}
                                        className={cn(
                                            "w-7 h-7 rounded-md text-xs font-medium transition-colors border",
                                            n <= rating
                                                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                                                : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                                {rating > 0 && (
                                    <span className="ml-1 text-xs text-yellow-300 flex items-center gap-0.5">
                                        <Star className="w-3 h-3" fill="currentColor" /> {rating}/10
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Rewatch */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rewatched}
                                    onChange={(e) => setRewatched(e.target.checked)}
                                    disabled={isSubmitting}
                                    className="w-4 h-4 rounded accent-accent"
                                />
                                <span className="text-sm text-zinc-300">Rewatched</span>
                            </label>
                            {rewatched && (
                                <div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={rewatchCount}
                                        onChange={(e) => setRewatchCount(e.target.value)}
                                        placeholder="Times"
                                        className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label htmlFor="binge-notes" className="block text-xs text-zinc-500 mb-1.5">Notes</label>
                            <textarea
                                id="binge-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Thoughts, review, context…"
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3">
                            {formError && <span className="text-red-400 text-xs self-center">{formError}</span>}
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isSubmitting ? "Saving…" : (editingId ? "Update" : "Add")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search title, genre, platform…"
                            aria-label="Search binge items"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 ml-auto">{filtered.length} visible</p>
                </div>

                {/* Status filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                            statusFilter === "all"
                                ? "bg-accent/15 border-accent/35 text-accent"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        All
                    </button>
                    {STATUSES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                statusFilter === s
                                    ? STATUS_STYLES[s]
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {STATUS_LABELS[s]}
                        </button>
                    ))}
                </div>

                {/* Type filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setTypeFilter("all")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                            typeFilter === "all"
                                ? "bg-accent/15 border-accent/35 text-accent"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        All Types
                    </button>
                    {TYPES.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                typeFilter === t
                                    ? TYPE_STYLES[t]
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {TYPE_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Item Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
                        <span>Loading your watchlist…</span>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Tv className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No items found for current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((item) => (
                        <article
                            key={item._id}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group"
                        >
                            <div className="flex items-start gap-3">
                                {/* Poster */}
                                <div className="w-14 h-20 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                    {item.payload.poster_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.payload.poster_url}
                                            alt={item.payload.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Tv className="w-5 h-5 text-zinc-600" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-zinc-50 line-clamp-2 leading-snug">{item.payload.title}</p>
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        {item.payload.year && (
                                            <span className="text-[10px] text-zinc-500">{item.payload.year}</span>
                                        )}
                                        {item.payload.platform && (
                                            <span className="text-[10px] text-zinc-500">· {item.payload.platform}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", TYPE_STYLES[item.payload.type])}>
                                            {TYPE_LABELS[item.payload.type]}
                                        </span>
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", STATUS_STYLES[item.payload.status])}>
                                            {STATUS_LABELS[item.payload.status]}
                                        </span>
                                        {item.payload.rating ? (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300 flex items-center gap-0.5">
                                                <Star className="w-2.5 h-2.5" fill="currentColor" /> {item.payload.rating}/10
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        disabled={isDeletingId === item._id}
                                        aria-label="Edit item"
                                        title="Edit"
                                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item._id)}
                                        disabled={isDeletingId === item._id}
                                        aria-label="Delete item"
                                        title="Delete"
                                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        {isDeletingId === item._id
                                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Series progress */}
                            {(item.payload.type === "series" || item.payload.type === "anime") &&
                                item.payload.current_season && (
                                    <p className="text-[10px] text-zinc-500">
                                        S{item.payload.current_season}
                                        {item.payload.current_episode ? ` · E${item.payload.current_episode}` : ""}
                                        {item.payload.total_seasons ? ` / ${item.payload.total_seasons} seasons` : ""}
                                    </p>
                                )}

                            {/* Notes */}
                            {item.payload.notes && (
                                <p className="text-xs text-zinc-400 line-clamp-2">{item.payload.notes}</p>
                            )}

                            {/* Footer meta */}
                            <div className="flex items-center gap-2 flex-wrap mt-auto">
                                {item.payload.genre && (
                                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px]">{item.payload.genre}</span>
                                )}
                                {item.payload.recommended_by && (
                                    <span className="text-[10px] text-zinc-500">via {item.payload.recommended_by}</span>
                                )}
                                {item.payload.rewatched && item.payload.rewatch_count > 0 && (
                                    <span className="text-[10px] text-accent">↺ ×{item.payload.rewatch_count}</span>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
