"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, RefreshCw, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  STATUS_LABELS,
  parseNonNegativeIntegerField,
  parseOptionalPositiveIntegerField,
  toDateInputValue,
  toISODate,
  type Book,
  type BookStatus,
} from "./types";

interface BookFormProps {
  editingBook: Book | null;
  defaultStatus: BookStatus;
  onSave: () => Promise<void>;
  onClose: () => void;
}

const QUICK_ADD_STATUSES: { status: BookStatus; label: string }[] = [
  { status: "want_to_read", label: "To Read" },
  { status: "reading", label: "Reading Now" },
  { status: "completed", label: "Finished" },
];

export default function BookForm({
  editingBook,
  defaultStatus,
  onSave,
  onClose,
}: BookFormProps) {
  const [title, setTitle] = useState(editingBook?.payload.title ?? "");
  const [author, setAuthor] = useState(editingBook?.payload.author ?? "");
  const [status, setStatus] = useState<BookStatus>(
    (editingBook?.payload.status as BookStatus) ?? defaultStatus,
  );
  const [totalPages, setTotalPages] = useState(
    editingBook?.payload.total_pages?.toString() ?? "",
  );
  const [currentPage, setCurrentPage] = useState(
    (editingBook?.payload.current_page || 0).toString(),
  );
  const [rating, setRating] = useState(editingBook?.payload.rating ?? 0);
  const [coverUrl, setCoverUrl] = useState(
    editingBook?.payload.cover_url ?? "",
  );
  const [summary, setSummary] = useState(editingBook?.payload.summary ?? "");
  const [notes, setNotes] = useState(editingBook?.payload.notes ?? "");
  const [startedAt, setStartedAt] = useState(
    toDateInputValue(editingBook?.payload.started_at),
  );
  const [finishedAt, setFinishedAt] = useState(
    toDateInputValue(editingBook?.payload.finished_at),
  );
  const [tagsInput, setTagsInput] = useState(
    (editingBook?.payload.tags ?? []).join(", "),
  );
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const isEditing = !!editingBook;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError("");

      if (!title.trim()) {
        setFormError("Title required");
        return;
      }
      if (!author.trim()) {
        setFormError("Author required");
        return;
      }

      const totalPagesResult = parseOptionalPositiveIntegerField(
        totalPages,
        "Total pages",
      );
      if (totalPagesResult.error) {
        setFormError(totalPagesResult.error);
        return;
      }

      const currentPageResult = parseNonNegativeIntegerField(
        currentPage,
        "Current page",
      );
      if (currentPageResult.error) {
        setFormError(currentPageResult.error);
        return;
      }

      const totalPagesNum = totalPagesResult.value;
      const currentPageNum = currentPageResult.value ?? 0;

      if (
        Number.isFinite(totalPagesNum) &&
        totalPagesNum !== undefined &&
        currentPageNum > totalPagesNum
      ) {
        setFormError("Current page cannot exceed total pages");
        return;
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        author: author.trim(),
        status,
        total_pages: totalPagesNum,
        current_page: currentPageNum,
        rating: rating || undefined,
        cover_url: coverUrl.trim() || undefined,
        summary: summary.trim() || undefined,
        notes: notes.trim() || undefined,
        started_at:
          toISODate(startedAt) ||
          (status === "reading" && !isEditing
            ? new Date().toISOString()
            : undefined),
        finished_at:
          toISODate(finishedAt) ||
          (status === "completed" && !isEditing
            ? new Date().toISOString()
            : undefined),
        tags: tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      setIsSubmitting(true);
      try {
        const res = isEditing
          ? await fetch(`/api/content/${editingBook._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload }),
            })
          : await fetch("/api/content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                module_type: "book",
                is_public: false,
                payload,
              }),
            });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save book");

        await onSave();
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      author,
      status,
      totalPages,
      currentPage,
      rating,
      coverUrl,
      summary,
      notes,
      startedAt,
      finishedAt,
      tagsInput,
      isEditing,
      editingBook,
      onSave,
      onClose,
    ],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-zinc-50">
              {isEditing ? "Edit" : "Add"} Book
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick-add status chips (only for new books) */}
        {!isEditing && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-xs uppercase tracking-wider text-zinc-600 font-medium">
              Quick status
            </span>
            {QUICK_ADD_STATUSES.map((qs) => (
              <button
                key={qs.status}
                type="button"
                onClick={() => setStatus(qs.status)}
                aria-pressed={status === qs.status}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs border transition-all",
                  status === qs.status
                    ? "bg-accent/15 border-accent/35 text-accent"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600",
                )}
              >
                {qs.label}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Title */}
          <div>
            <label
              htmlFor="book-title"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Title
            </label>
            <input
              id="book-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* Author */}
          <div>
            <label
              htmlFor="book-author"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Author
            </label>
            <input
              id="book-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              disabled={isSubmitting}
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="book-status"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Status
            </label>
            <select
              id="book-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BookStatus)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
              disabled={isSubmitting}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          {/* Cover URL */}
          <div>
            <label
              htmlFor="book-cover"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Cover URL
            </label>
            <input
              id="book-cover"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              maxLength={2048}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              disabled={isSubmitting}
            />
          </div>

          {/* Pages */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="book-total-pages"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Total Pages
              </label>
              <input
                id="book-total-pages"
                type="number"
                min={0}
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                placeholder="300"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="book-current-page"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Current Page
              </label>
              <input
                id="book-current-page"
                type="number"
                min={0}
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                placeholder="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="book-started"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Started
              </label>
              <input
                id="book-started"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="book-finished"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Finished
              </label>
              <input
                id="book-finished"
                type="date"
                value={finishedAt}
                onChange={(e) => setFinishedAt(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hoveredStar || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    disabled={isSubmitting}
                    aria-label={`Rate ${star} stars`}
                    className={cn(
                      "p-1 transition-all duration-150 disabled:opacity-50",
                      filled
                        ? "text-warning scale-110"
                        : "text-zinc-600 hover:text-zinc-400",
                    )}
                  >
                    <Star
                      className="w-5 h-5"
                      fill={filled ? "currentColor" : "none"}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="text-xs text-zinc-500 ml-2">{rating}/5</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="book-tags"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Tags
            </label>
            <input
              id="book-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="fiction, self-help, sci-fi"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              disabled={isSubmitting}
            />
          </div>

          {/* Summary */}
          <div className="md:col-span-2">
            <label
              htmlFor="book-summary"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Summary
            </label>
            <textarea
              id="book-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Short summary of the book"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y transition-shadow"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label
              htmlFor="book-notes"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="book-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Personal notes and reflections"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y transition-shadow"
              disabled={isSubmitting}
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <AnimatePresence>
              {formError && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-danger text-xs"
                >
                  {formError}
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label={isEditing ? "Update book" : "Add book"}
              className="bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Adding..."
                : isEditing
                  ? "Update"
                  : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
