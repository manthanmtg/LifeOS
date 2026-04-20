"use client";

import { useState } from "react";
import { X, RefreshCw, Check, Plus } from "lucide-react";
import { ReadingItem, ReadingPayload, ReadingType, Priority } from "../types";
import { extractDomain } from "../utils";

const PRIORITIES: Priority[] = ["high", "medium", "low"];

interface ReadingFormProps {
  initialData?: ReadingItem | null;
  allTypes: ReadingType[];
  defaultPriority: Priority;
  defaultType: ReadingType;
  onSubmit: (payload: ReadingPayload, id?: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  formError: string;
}

export function ReadingForm({
  initialData,
  allTypes,
  defaultPriority,
  defaultType,
  onSubmit,
  onCancel,
  isSubmitting,
  formError,
}: ReadingFormProps) {
  const [url, setUrl] = useState(initialData?.payload.url || "");
  const [title, setTitle] = useState(initialData?.payload.title || "");
  const [priority, setPriority] = useState<Priority>(
    initialData?.payload.priority || defaultPriority,
  );
  const [type, setType] = useState<ReadingType>(
    initialData?.payload.type || defaultType,
  );
  const [notes, setNotes] = useState(initialData?.payload.notes || "");
  const [tags, setTags] = useState(initialData?.payload.tags?.join(", ") || "");

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (!title.trim() && !initialData) {
      const domain = extractDomain(value);
      if (domain) setTitle(domain);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ReadingPayload = {
      url: url.trim(),
      title: title.trim(),
      source_domain: extractDomain(url),
      priority,
      type,
      is_read: initialData?.payload.is_read || false,
      notes: notes.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    onSubmit(payload, initialData?._id);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">
          {initialData ? "Edit Reading Item" : "Add to Reading Queue"}
        </h2>
        <button
          onClick={onCancel}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="reading-url" className="block text-xs text-zinc-500 mb-1.5">
            URL
          </label>
          <input
            id="reading-url"
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://..."
            autoFocus
            disabled={isSubmitting}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
            required
          />
        </div>
        <div>
          <label htmlFor="reading-title" className="block text-xs text-zinc-500 mb-1.5">
            Title
          </label>
          <input
            id="reading-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Readable title"
            disabled={isSubmitting}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
            required
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="reading-priority" className="block text-xs text-zinc-500 mb-1.5">
              Priority
            </label>
            <select
              id="reading-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
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
          <div className="flex-1">
            <label htmlFor="reading-type" className="block text-xs text-zinc-500 mb-1.5">
              Type
            </label>
            <select
              id="reading-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {allTypes.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="reading-notes" className="block text-xs text-zinc-500 mb-1.5">
            Notes (optional)
          </label>
          <textarea
            id="reading-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Why this matters"
            disabled={isSubmitting}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="reading-tags" className="block text-xs text-zinc-500 mb-1.5">
            Tags (optional, comma separated)
          </label>
          <input
            id="reading-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. AI, Development, Research"
            disabled={isSubmitting}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
          {formError && (
            <span className="text-danger text-xs self-center">
              {formError}
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : initialData ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isSubmitting
              ? initialData
                ? "Updating..."
                : "Adding..."
              : initialData
                ? "Update"
                : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
