"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, RefreshCw, Star, Plus, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BingeItem } from "../types";
import { STATUSES, TYPES, STATUS_LABELS, TYPE_LABELS } from "../types";

interface BingeFormProps {
  editingItem: BingeItem | null;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export default function BingeForm({
  editingItem,
  onSave,
  onClose,
}: BingeFormProps) {
  const isEditing = !!editingItem;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("movie");
  const [status, setStatus] = useState<string>("to_watch");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const populateForm = useCallback((item: BingeItem) => {
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
  }, []);

  useEffect(() => {
    if (editingItem) {
      populateForm(editingItem);
    }
  }, [editingItem, populateForm]);

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
      if (currentSeason)
        payload.current_season = Number.parseInt(currentSeason, 10);
      if (currentEpisode)
        payload.current_episode = Number.parseInt(currentEpisode, 10);
      if (totalSeasons)
        payload.total_seasons = Number.parseInt(totalSeasons, 10);
    }

    setIsSubmitting(true);
    try {
      const res = editingItem
        ? await fetch(`/api/content/${editingItem._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload }),
          })
        : await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              module_type: "binge_item",
              is_public: false,
              payload,
            }),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      await onSave();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSeriesType = type === "series" || type === "anime";

  const inputClassName =
    "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Edit3 className="w-4 h-4 text-accent" />
            ) : (
              <Plus className="w-4 h-4 text-accent" />
            )}
            <h2 className="text-lg font-semibold text-zinc-50">
              {isEditing ? "Edit" : "Add"} Item
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Title */}
          <div className="md:col-span-2">
            <label
              htmlFor="binge-title"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Title <span className="text-danger">*</span>
            </label>
            <input
              id="binge-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Movie or series title"
              className={inputClassName}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="binge-type"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Type
            </label>
            <select
              id="binge-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="binge-status"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Status
            </label>
            <select
              id="binge-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Genre */}
          <div>
            <label
              htmlFor="binge-genre"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Genre
            </label>
            <input
              id="binge-genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Action, Comedy, Thriller..."
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          {/* Platform */}
          <div>
            <label
              htmlFor="binge-platform"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Platform
            </label>
            <input
              id="binge-platform"
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Netflix, Prime, HBO..."
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          {/* Year */}
          <div>
            <label
              htmlFor="binge-year"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Year
            </label>
            <input
              id="binge-year"
              type="number"
              min={1900}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          {/* Poster URL */}
          <div>
            <label
              htmlFor="binge-poster"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Poster URL
            </label>
            <input
              id="binge-poster"
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          {/* Recommended By */}
          <div>
            <label
              htmlFor="binge-rec-by"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Recommended By
            </label>
            <input
              id="binge-rec-by"
              type="text"
              value={recommendedBy}
              onChange={(e) => setRecommendedBy(e.target.value)}
              placeholder="Friend, Reddit..."
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          {/* Series fields */}
          {isSeriesType && (
            <>
              <div>
                <label
                  htmlFor="binge-season"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Current Season
                </label>
                <input
                  id="binge-season"
                  type="number"
                  min={1}
                  value={currentSeason}
                  onChange={(e) => setCurrentSeason(e.target.value)}
                  placeholder="1"
                  className={inputClassName}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label
                  htmlFor="binge-episode"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Current Episode
                </label>
                <input
                  id="binge-episode"
                  type="number"
                  min={1}
                  value={currentEpisode}
                  onChange={(e) => setCurrentEpisode(e.target.value)}
                  placeholder="1"
                  className={inputClassName}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label
                  htmlFor="binge-total-seasons"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Total Seasons
                </label>
                <input
                  id="binge-total-seasons"
                  type="number"
                  min={1}
                  value={totalSeasons}
                  onChange={(e) => setTotalSeasons(e.target.value)}
                  placeholder="Optional"
                  className={inputClassName}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {/* Rating (1-10) */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              Rating (1-10)
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? 0 : n)}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disabled={isSubmitting}
                  aria-label={`Rate ${n}`}
                  className={cn(
                    "w-7 h-7 rounded-md text-xs font-medium transition-all border",
                    n <= (hoveredStar || rating)
                      ? "bg-warning/20 text-warning border-warning/40 scale-105"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300",
                  )}
                >
                  {n}
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-1 text-xs text-warning flex items-center gap-0.5">
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
            <label
              htmlFor="binge-notes"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="binge-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Thoughts, review, context..."
              className={cn(inputClassName, "resize-y")}
              disabled={isSubmitting}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3">
            <AnimatePresence>
              {formError && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-danger text-xs self-center"
                >
                  {formError}
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={onClose}
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
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
