"use client";

import { Check, X } from "lucide-react";
import { normalizeIdeaCategories } from "../insights";
import { IDEA_STATUS_LABELS } from "../shared";

const STATUSES = ["raw", "exploring", "archived"] as const;

interface IdeaSettingsPanelProps {
  categories: string[];
  defaultPriority: string;
  defaultStatus: string;
  newCategory: string;
  saving: boolean;
  onDefaultPriorityChange: (value: string) => void;
  onDefaultStatusChange: (value: string) => void;
  onNewCategoryChange: (value: string) => void;
  onCategoriesChange: (categories: string[]) => void;
}

export default function IdeaSettingsPanel({
  categories,
  defaultPriority,
  defaultStatus,
  newCategory,
  saving,
  onDefaultPriorityChange,
  onDefaultStatusChange,
  onNewCategoryChange,
  onCategoriesChange,
}: IdeaSettingsPanelProps) {
  const addCategory = () => {
    const nextCategories = normalizeIdeaCategories([
      ...categories,
      newCategory,
    ]);
    if (nextCategories.length === categories.length) return;

    onCategoriesChange(nextCategories);
    onNewCategoryChange("");
  };

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">Ideas Settings</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Adjust the default lane, default priority, and reusable categories.
          </p>
        </div>
        {saving ? (
          <span className="flex items-center gap-1 text-xs text-accent">
            <Check className="h-3 w-3" /> Saved
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="idea-default-status"
            className="mb-1.5 block text-xs text-zinc-500"
          >
            Default Status
          </label>
          <select
            id="idea-default-status"
            value={defaultStatus}
            onChange={(event) => onDefaultStatusChange(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {IDEA_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="idea-default-priority"
            className="mb-1.5 block text-xs text-zinc-500"
          >
            Default Priority
          </label>
          <select
            id="idea-default-priority"
            value={defaultPriority}
            onChange={(event) => onDefaultPriorityChange(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-zinc-500">
          Quick Categories
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
            >
              {category}
              <button
                type="button"
                onClick={() =>
                  onCategoriesChange(
                    categories.filter((item) => item !== category),
                  )
                }
                className="ml-0.5 text-zinc-500 transition-colors hover:text-danger"
                aria-label={`Remove ${category} category`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="new-category-input"
            type="text"
            value={newCategory}
            onChange={(event) => onNewCategoryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCategory();
              }
            }}
            placeholder="New category"
            aria-label="New category name"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCategory.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
