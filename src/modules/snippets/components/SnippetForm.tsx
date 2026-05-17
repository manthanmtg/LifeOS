import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check, Star, RefreshCw, Eye, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet, SnippetSettings } from "./types";
import { withLineNumbers, highlightCode } from "./types";

interface SnippetFormProps {
  visible: boolean;
  editingSnippet: Snippet | null;
  settings: SnippetSettings;
  configuredLanguages: readonly string[];
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
  const [showPreview, setShowPreview] = useState(true);

  const displayCode = useMemo(() => {
    let highlighted = highlightCode(code);
    if (settings.showLineNumbers) {
      highlighted = withLineNumbers(highlighted);
    }
    return highlighted;
  }, [code, settings.showLineNumbers]);

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
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-5 shadow-2xl shadow-zinc-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-accent" />
                </div>
                <h2 className="text-lg font-bold text-zinc-50 tracking-tight">
                  {editingSnippet ? "Edit Snippet" : "New Snippet"}
                </h2>
              </div>
              <button
                aria-label="Close snippet form"
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6">
                  <label
                    htmlFor="snippet-title"
                    className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2"
                  >
                    Title
                  </label>
                  <input
                    id="snippet-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fetch API Wrapper"
                    autoFocus
                    disabled={isSubmitting}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                  />
                </div>

                <div className="md:col-span-4">
                  <label
                    htmlFor="snippet-language"
                    className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2"
                  >
                    Language
                  </label>
                  <select
                    id="snippet-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all appearance-none"
                  >
                    {configuredLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex flex-col">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Favorite
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsFavorite((prev) => !prev)}
                    disabled={isSubmitting}
                    className={cn(
                      "flex-1 rounded-xl transition-all border flex items-center justify-center gap-2 text-sm font-medium",
                      isFavorite
                        ? "text-warning bg-warning/5 border-warning/20 shadow-[0_0_15px_color-mix(in_srgb,var(--color-warning)_10%,transparent)]"
                        : "text-zinc-500 bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600",
                    )}
                  >
                    <Star
                      className="w-4 h-4"
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                    {isFavorite ? "Starred" : "Star"}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="snippet-code"
                    className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                  >
                    Source Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-[10px] flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-800/50 px-2 py-1 rounded"
                  >
                    <Eye className="w-3 h-3" />
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </button>
                </div>
                <textarea
                  id="snippet-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={10}
                  placeholder="// Paste your code here..."
                  disabled={isSubmitting}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono resize-y min-h-[150px]"
                />
              </div>

              {showPreview && code && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/45 p-4 relative shadow-sm backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/80">
                        Live Preview
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Copy preview code"
                      onClick={() => navigator.clipboard.writeText(code)}
                      className="text-zinc-500 hover:text-accent transition-colors p-1 rounded-md hover:bg-zinc-800/60"
                      title="Copy code"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <pre className="text-xs text-zinc-300 font-mono overflow-x-auto max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    <code
                      dangerouslySetInnerHTML={{ __html: displayCode }}
                      className="block whitespace-pre"
                    />
                  </pre>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="snippet-description"
                    className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2"
                  >
                    Description (Optional)
                  </label>
                  <input
                    id="snippet-description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short summary of what this does"
                    disabled={isSubmitting}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="snippet-tags"
                    className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2"
                  >
                    Tags (Comma separated)
                  </label>
                  <div className="relative">
                    <input
                      id="snippet-tags"
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="utility, api, hooks"
                      disabled={isSubmitting}
                      className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                    />
                    {tagsInput && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tagsInput
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] rounded-md font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 pt-2">
                <div className="flex-1">
                  {formError && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-danger text-xs font-medium bg-danger/5 px-3 py-2 rounded-lg border border-danger/20 inline-block"
                    >
                      {formError}
                    </motion.p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 md:flex-none px-6 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none bg-accent hover:bg-accent-hover text-zinc-50 font-bold px-8 py-2.5 rounded-xl text-sm shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
                        ? "Update Snippet"
                        : "Create Snippet"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
