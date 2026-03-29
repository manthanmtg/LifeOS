"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check, Star, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet, SnippetSettings } from "./types";
import { withLineNumbers } from "./types";

interface SnippetFormProps {
  visible: boolean;
  editingSnippet: Snippet | null;
  settings: SnippetSettings;
  configuredLanguages: string[];
  onSave: () => void;
  onClose: () => void;
}

export default function SnippetForm({
  visible,
  editingSnippet,
  settings,
  configuredLanguages,
  onSave,
  onClose,
}: SnippetFormProps) {
  const [title, setTitle] = useState(editingSnippet?.payload.title || "");
  const [code, setCode] = useState(editingSnippet?.payload.code || "");
  const [language, setLanguage] = useState(
    editingSnippet?.payload.language || settings.defaultLanguage,
  );
  const [description, setDescription] = useState(
    editingSnippet?.payload.description || "",
  );
  const [tagsInput, setTagsInput] = useState(
    editingSnippet?.payload.tags.join(", ") || "",
  );
  const [isFavorite, setIsFavorite] = useState(
    editingSnippet?.payload.is_favorite || false,
  );
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setFormError("");
      if (!title.trim()) {
        setFormError("Title required");
        return;
      }
      if (!code.trim()) {
        setFormError("Code required");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          title: title.trim(),
          code,
          language,
          description: description.trim() || undefined,
          tags: tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          is_favorite: isFavorite,
        };

        const response = editingSnippet
          ? await fetch(`/api/content/${editingSnippet._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload }),
            })
          : await fetch("/api/content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                module_type: "snippet",
                is_public: false,
                payload,
              }),
            });

        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to save snippet");

        onSave();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      code,
      language,
      description,
      tagsInput,
      isFavorite,
      editingSnippet,
      onSave,
    ],
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">
                {editingSnippet ? "Edit" : "New"} Snippet
              </h2>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="snippet-title"
                    className="block text-xs text-zinc-500 mb-1.5"
                  >
                    Title
                  </label>
                  <input
                    id="snippet-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Snippet name"
                    autoFocus
                    disabled={isSubmitting}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label
                      htmlFor="snippet-language"
                      className="block text-xs text-zinc-500 mb-1.5"
                    >
                      Language
                    </label>
                    <select
                      id="snippet-language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      {configuredLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-0.5">
                    <button
                      type="button"
                      onClick={() => setIsFavorite((prev) => !prev)}
                      disabled={isSubmitting}
                      className={cn(
                        "p-2.5 rounded-lg transition-colors disabled:opacity-50",
                        isFavorite
                          ? "text-warning bg-warning/10"
                          : "text-zinc-500 bg-zinc-800",
                      )}
                      aria-label={
                        isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      aria-pressed={isFavorite}
                    >
                      <Star
                        className="w-4 h-4"
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="snippet-code"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Code
                </label>
                <textarea
                  id="snippet-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={12}
                  placeholder="Paste your code"
                  disabled={isSubmitting}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="snippet-description"
                    className="block text-xs text-zinc-500 mb-1.5"
                  >
                    Description
                  </label>
                  <input
                    id="snippet-description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this solves"
                    disabled={isSubmitting}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="snippet-tags"
                    className="block text-xs text-zinc-500 mb-1.5"
                  >
                    Tags
                  </label>
                  <input
                    id="snippet-tags"
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="util, api, hook"
                    disabled={isSubmitting}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 mb-2">
                  Preview
                </p>
                <pre className="text-xs text-zinc-300 font-mono overflow-x-auto max-h-[180px] overflow-y-auto">
                  <code>
                    {settings.showLineNumbers
                      ? withLineNumbers(code || "")
                      : code || "// your snippet preview"}
                  </code>
                </pre>
              </div>

              <div className="flex justify-end gap-3">
                {formError && (
                  <span className="text-danger text-xs self-center">
                    {formError}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : editingSnippet ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isSubmitting
                    ? "Saving..."
                    : editingSnippet
                      ? "Update"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
