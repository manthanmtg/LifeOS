"use client";

import { RefObject, useMemo } from "react";
import { Bold, RefreshCw, Save, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import MarkdownPreview from "@/modules/blog/MarkdownPreview";
import { EditorDraft, PostStatus, ViewMode } from "@/modules/blog/types";
import { estimateReadingTime, wordCount } from "@/modules/blog/utils";

interface ToolbarItem {
  label: string;
  icon: typeof Bold;
  action: () => void;
}

interface BlogEditorProps {
  autoSaveMessage: string;
  autoSaveTone: "muted" | "success" | "danger";
  draft: EditorDraft;
  editingId: string | null;
  formError: string;
  lastSavedAt: string | null;
  manualSaving: boolean;
  showEditor: boolean;
  slugConflict: boolean;
  slugManual: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  toolbarItems: ToolbarItem[];
  viewMode: ViewMode;
  onClose: () => void;
  onSave: () => void;
  onSetDraft: (
    updater: EditorDraft | ((previous: EditorDraft) => EditorDraft),
  ) => void;
  onSetSlugManual: (value: boolean) => void;
  onSetViewMode: (value: ViewMode) => void;
}

export default function BlogEditor({
  autoSaveMessage,
  autoSaveTone,
  draft,
  editingId,
  formError,
  lastSavedAt,
  manualSaving,
  showEditor,
  slugConflict,
  slugManual,
  textareaRef,
  toolbarItems,
  viewMode,
  onClose,
  onSave,
  onSetDraft,
  onSetSlugManual,
  onSetViewMode,
}: BlogEditorProps) {
  const words = wordCount(draft.content);
  const readTime = estimateReadingTime(draft.content);
  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return "";
    return new Date(lastSavedAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSavedAt]);

  return (
    <AnimatePresence initial={false}>
      {showEditor && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {editingId ? "Edit Post" : "Compose Post"}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {words} words • {readTime} min read
                {lastSavedLabel ? ` • Last saved ${lastSavedLabel}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  autoSaveTone === "success" &&
                    "border-success/30 bg-success/10 text-success",
                  autoSaveTone === "danger" &&
                    "border-danger/30 bg-danger/10 text-danger",
                  autoSaveTone === "muted" &&
                    "border-zinc-700 bg-zinc-800 text-zinc-400",
                )}
              >
                {autoSaveMessage}
              </div>

              <button
                onClick={onClose}
                aria-label="Close editor"
                title="Close editor"
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>

              <button
                onClick={onSave}
                disabled={manualSaving || slugConflict}
                aria-label={
                  editingId ? "Save post changes" : "Publish new post"
                }
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {manualSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {manualSaving ? "Saving..." : "Save Post"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">
                Title
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(event) =>
                  onSetDraft((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="A clear, specific title..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Slug</label>
              <input
                type="text"
                value={draft.slug}
                aria-label="Post slug"
                onChange={(event) => {
                  onSetDraft((previous) => ({
                    ...previous,
                    slug: event.target.value,
                  }));
                  onSetSlugManual(true);
                }}
                className={cn(
                  "w-full rounded-lg border bg-zinc-800 px-4 py-2.5 font-mono text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40",
                  slugConflict ? "border-danger/50" : "border-zinc-700",
                )}
              />
              {slugConflict && (
                <p className="mt-1 text-xs text-danger">Slug already exists.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["split", "write", "preview"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetViewMode(mode)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  viewMode === mode
                    ? "bg-accent/15 text-accent"
                    : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                )}
              >
                {mode}
              </button>
            ))}
            <span className="ml-auto text-xs text-zinc-500">
              Shortcut: Ctrl/Cmd + S to save
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {toolbarItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                disabled={viewMode === "preview"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-40"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {viewMode !== "preview" && (
                <textarea
                  ref={textareaRef}
                  value={draft.content}
                  onChange={(event) =>
                    onSetDraft((previous) => ({
                      ...previous,
                      content: event.target.value,
                    }))
                  }
                  rows={16}
                  placeholder="Write your post in Markdown..."
                  className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              )}

              {viewMode !== "write" && (
                <div className="min-h-[22rem] rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
                  {draft.content.trim() ? (
                    <MarkdownPreview content={draft.content} />
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Live preview appears here as you write.
                    </p>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Publishing
                </p>

                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Status
                  </label>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      onSetDraft((previous) => ({
                        ...previous,
                        status: event.target.value as PostStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={draft.tagsInput}
                    onChange={(event) =>
                      onSetDraft((previous) => ({
                        ...previous,
                        tagsInput: event.target.value,
                      }))
                    }
                    placeholder="react, nextjs, ux"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
                    <span>SEO description</span>
                    <span
                      className={
                        draft.seoDesc.length > 160 ? "text-danger" : ""
                      }
                    >
                      {draft.seoDesc.length}/160
                    </span>
                  </label>
                  <textarea
                    value={draft.seoDesc}
                    onChange={(event) =>
                      onSetDraft((previous) => ({
                        ...previous,
                        seoDesc: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Search snippet for this post..."
                    className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    Cover image URL
                  </label>
                <input
                  type="url"
                  value={draft.coverImageUrl}
                  onChange={(event) =>
                    onSetDraft((previous) => ({
                      ...previous,
                      coverImageUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  maxLength={2048}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                  Readability
                </p>
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center justify-between text-zinc-300">
                    <span>Word count</span>
                    <span className="font-medium text-zinc-100">{words}</span>
                  </p>
                  <p className="flex items-center justify-between text-zinc-300">
                    <span>Estimated read</span>
                    <span className="font-medium text-zinc-100">
                      {readTime} min
                    </span>
                  </p>
                  <p className="flex items-center justify-between text-zinc-300">
                    <span>Auto slug</span>
                    <span className="font-medium text-zinc-100">
                      {slugManual ? "Manual" : "Enabled"}
                    </span>
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {formError && (
            <div className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
