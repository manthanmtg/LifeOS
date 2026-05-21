"use client";

import { RefreshCw, X } from "lucide-react";
import {
  IDEA_STATUS_LABELS,
  type IdeaBoardStatus,
  type IdeaPriority,
} from "../shared";

const STATUSES = ["raw", "exploring", "archived"] as const;
const PRIORITIES = ["high", "medium", "low"] as const;

interface IdeaFormPanelProps {
  editingId: string | null;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  status: IdeaBoardStatus;
  setStatus: (v: IdeaBoardStatus) => void;
  priority: IdeaPriority;
  setPriority: (v: IdeaPriority) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  isSubmitting: boolean;
  formError: string;
  categories: string[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40";
const labelClass = "block text-xs text-zinc-500 mb-1.5";

export default function IdeaFormPanel({
  editingId,
  title,
  setTitle,
  description,
  setDescription,
  notes,
  setNotes,
  category,
  setCategory,
  status,
  setStatus,
  priority,
  setPriority,
  tagsInput,
  setTagsInput,
  isSubmitting,
  formError,
  categories,
  onSubmit,
  onCancel,
}: IdeaFormPanelProps) {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-accent/10 backdrop-blur-md transition-colors hover:border-accent/50 hover:shadow-accent/20 animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-50">
          {editingId ? "Edit" : "New"} Idea
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800/70 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label="Close form"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="md:col-span-2">
          <label htmlFor="idea-title" className={labelClass}>
            Title
          </label>
          <input
            id="idea-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Idea title"
            autoFocus
            disabled={isSubmitting}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="idea-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="idea-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the idea and why it matters"
            disabled={isSubmitting}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="idea-notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="idea-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional notes or context"
            disabled={isSubmitting}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
          />
        </div>

        <div>
          <label htmlFor="idea-category" className={labelClass}>
            Category
          </label>
          <input
            id="idea-category"
            type="text"
            list="idea-categories-list"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Product, Research..."
            disabled={isSubmitting}
            className={inputClass}
          />
          <datalist id="idea-categories-list">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          {categories.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-accent/40 hover:text-zinc-50"
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="idea-status" className={labelClass}>
              Status
            </label>
            <select
              id="idea-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IdeaBoardStatus)}
              disabled={isSubmitting}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {IDEA_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="idea-priority" className={labelClass}>
              Priority
            </label>
            <select
              id="idea-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as IdeaPriority)}
              disabled={isSubmitting}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="idea-tags" className={labelClass}>
            Tags
          </label>
          <input
            id="idea-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ai, workflow, startup"
            disabled={isSubmitting}
            aria-describedby="idea-tags-hint"
            className={inputClass}
          />
          <p id="idea-tags-hint" className="mt-1 text-xs text-zinc-500">
            Separate tags with commas to keep related concepts easy to find.
          </p>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 items-center">
          {formError && (
            <span className="text-danger text-xs">{formError}</span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            aria-label={editingId ? "Update idea" : "Add idea"}
            className="bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isSubmitting
              ? editingId
                ? "Updating..."
                : "Adding..."
              : editingId
                ? "Update"
                : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
