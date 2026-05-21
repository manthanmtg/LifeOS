"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Code2,
  FileText,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import BlogAdminHeader from "@/modules/blog/components/BlogAdminHeader";
import BlogAdminToolbar from "@/modules/blog/components/BlogAdminToolbar";
import BlogEditor from "@/modules/blog/components/BlogEditor";
import BlogPostGrid from "@/modules/blog/components/BlogPostGrid";
import {
  BlogPayload,
  BlogPost,
  EditorDraft,
  PostStatus,
  StatusFilter,
  ViewMode,
} from "@/modules/blog/types";
import {
  buildBlogSummary,
  parseTagInput,
  slugify,
  sortPostsByNewest,
} from "@/modules/blog/utils";

const EMPTY_EDITOR_DRAFT: EditorDraft = {
  title: "",
  slug: "",
  content: "",
  status: "draft",
  tagsInput: "",
  seoDesc: "",
  coverImageUrl: "",
  publishedAt: undefined,
};

const LOCAL_DRAFT_KEY = "lifeos-blog-editor-draft-v1";
const AUTOSAVE_DELAY_MS = 1200;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function BlogAdminView() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorDraft>(EMPTY_EDITOR_DRAFT);
  const [slugManual, setSlugManual] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const [manualSaving, setManualSaving] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState("Idle");
  const [autoSaveTone, setAutoSaveTone] = useState<
    "muted" | "success" | "danger"
  >("muted");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isTogglingStatusId, setIsTogglingStatusId] = useState<string | null>(
    null,
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baselineSnapshotRef = useRef<string>(
    JSON.stringify(EMPTY_EDITOR_DRAFT),
  );

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch("/api/content?module_type=blog_post");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch posts");
      }
      setPosts(sortPostsByNewest(payload.data || []));
    } catch (error) {
      console.error("fetchPosts failed:", error);
      setFormError("Failed to load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!showEditor || slugManual) return;
    setDraft((previous) => {
      const nextSlug = slugify(previous.title);
      if (nextSlug === previous.slug) return previous;
      return { ...previous, slug: nextSlug };
    });
  }, [showEditor, slugManual, draft.title]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setHasLocalDraft(Boolean(window.localStorage.getItem(LOCAL_DRAFT_KEY)));
    } catch {
      setHasLocalDraft(false);
    }
  }, []);

  const openEditorWithDraft = useCallback(
    (nextDraft: EditorDraft, nextId: string | null, manualSlug: boolean) => {
      setDraft(nextDraft);
      setEditingId(nextId);
      setSlugManual(manualSlug);
      setShowEditor(true);
      setViewMode("split");
      setFormError("");
      setAutoSaveMessage("Idle");
      setAutoSaveTone("muted");
      baselineSnapshotRef.current = JSON.stringify(nextDraft);
    },
    [],
  );

  const isSlugTaken = useCallback(
    (slug: string) => {
      const normalized = slug.trim().toLowerCase();
      if (!normalized) return false;
      return posts.some(
        (post) =>
          post.payload.slug.toLowerCase() === normalized &&
          post._id !== editingId,
      );
    },
    [posts, editingId],
  );

  const slugConflict = showEditor && isSlugTaken(draft.slug);
  const draftSnapshot = JSON.stringify(draft);
  const isDirty = showEditor && draftSnapshot !== baselineSnapshotRef.current;
  const canPersistServer = Boolean(
    draft.title.trim() && draft.slug.trim() && draft.content.trim(),
  );

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== "all" && post.payload.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const haystack =
        `${post.payload.title} ${post.payload.slug} ${post.payload.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [posts, search, statusFilter]);

  const stats = useMemo(() => buildBlogSummary(posts), [posts]);

  const upsertPostLocally = useCallback(
    (id: string, payload: BlogPayload, savedAt: string) => {
      setPosts((previous) =>
        sortPostsByNewest(
          previous.map((post) =>
            post._id === id ? { ...post, payload, updated_at: savedAt } : post,
          ),
        ),
      );
    },
    [],
  );

  const persistDraftToServer = useCallback(
    async (mode: "manual" | "autosave") => {
      const savedAt = new Date().toISOString();
      const payload: BlogPayload = {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        content: draft.content,
        status: draft.status,
        tags: parseTagInput(draft.tagsInput),
        estimated_reading_time: Math.max(
          1,
          Math.ceil(
            draft.content.trim().split(/\s+/).filter(Boolean).length / 200,
          ),
        ),
        seo_description: draft.seoDesc.trim() || undefined,
        cover_image_url: draft.coverImageUrl.trim() || undefined,
      };

      if (payload.status === "published") {
        payload.published_at = draft.publishedAt || savedAt;
      }

      if (editingId) {
        const response = await fetch(`/api/content/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
        if (!response.ok) throw new Error("Save failed");
        upsertPostLocally(editingId, payload, savedAt);
        return { id: editingId, payload, savedAt };
      }

      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "blog_post",
          is_public: true,
          payload,
        }),
      });
      if (!response.ok) throw new Error("Save failed");

      const data = await response.json();
      const id = String(data.data?._id || data.data?.insertedId);
      const createdPost: BlogPost = {
        _id: id,
        payload,
        created_at: savedAt,
        updated_at: savedAt,
      };

      if (mode === "manual") {
        await fetchPosts();
      } else {
        setPosts((previous) => sortPostsByNewest([createdPost, ...previous]));
      }

      return { id, payload, savedAt };
    },
    [draft, editingId, fetchPosts, upsertPostLocally],
  );

  const validateDraft = useCallback(
    (strict: boolean): string | null => {
      if (!draft.title.trim()) return "Title is required.";
      if (!draft.slug.trim()) return "Slug is required.";
      if (isSlugTaken(draft.slug)) return "Slug already exists.";
      if (strict && !draft.content.trim()) return "Content is required.";
      if (draft.seoDesc.length > 160) {
        return "SEO description should be 160 characters or less.";
      }
      if (
        draft.coverImageUrl.trim() &&
        !isValidHttpUrl(draft.coverImageUrl.trim())
      ) {
        return "Cover image URL must be valid.";
      }
      return null;
    },
    [draft, isSlugTaken],
  );

  const updateAutoSaveStatus = (
    text: string,
    tone: "muted" | "success" | "danger",
  ) => {
    setAutoSaveMessage(text);
    setAutoSaveTone(tone);
  };

  const saveLocalDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        LOCAL_DRAFT_KEY,
        JSON.stringify({
          draft,
          slugManual,
          savedAt: new Date().toISOString(),
        }),
      );
      setHasLocalDraft(true);
    } catch {
      setHasLocalDraft(false);
    }
  }, [draft, slugManual]);

  const clearLocalDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      setHasLocalDraft(false);
    } catch {}
  }, []);

  const handleManualSave = useCallback(async () => {
    setFormError("");
    const validation = validateDraft(true);
    if (validation) {
      setFormError(validation);
      return;
    }

    setManualSaving(true);
    updateAutoSaveStatus("Saving...", "muted");
    try {
      const result = await persistDraftToServer("manual");
      const normalizedDraft: EditorDraft = {
        title: result.payload.title,
        slug: result.payload.slug,
        content: result.payload.content,
        status: result.payload.status,
        tagsInput: result.payload.tags.join(", "),
        seoDesc: result.payload.seo_description || "",
        coverImageUrl: result.payload.cover_image_url || "",
        publishedAt: result.payload.published_at,
      };
      setDraft(normalizedDraft);
      setEditingId(result.id);
      baselineSnapshotRef.current = JSON.stringify(normalizedDraft);
      setLastSavedAt(result.savedAt);
      updateAutoSaveStatus("Saved", "success");
      clearLocalDraft();
    } catch {
      setFormError("Failed to save post.");
      updateAutoSaveStatus("Save failed", "danger");
    } finally {
      setManualSaving(false);
    }
  }, [clearLocalDraft, persistDraftToServer, validateDraft]);

  useEffect(() => {
    if (!showEditor || !isDirty || manualSaving) return;

    const timer = window.setTimeout(async () => {
      if (!editingId) {
        saveLocalDraft();
        baselineSnapshotRef.current = JSON.stringify(draft);
        setLastSavedAt(new Date().toISOString());
        updateAutoSaveStatus("Auto-saved locally", "success");
        return;
      }

      const validation = validateDraft(false);
      if (validation) {
        updateAutoSaveStatus(
          validation.includes("Slug")
            ? "Autosave paused: slug issue"
            : "Autosave waiting for required fields",
          "danger",
        );
        return;
      }

      if (!canPersistServer) {
        updateAutoSaveStatus(
          "Autosave waiting for title, slug, and content",
          "muted",
        );
        return;
      }

      updateAutoSaveStatus("Autosaving...", "muted");
      try {
        const result = await persistDraftToServer("autosave");
        const normalizedDraft: EditorDraft = {
          title: result.payload.title,
          slug: result.payload.slug,
          content: result.payload.content,
          status: result.payload.status,
          tagsInput: result.payload.tags.join(", "),
          seoDesc: result.payload.seo_description || "",
          coverImageUrl: result.payload.cover_image_url || "",
          publishedAt: result.payload.published_at,
        };
        setDraft(normalizedDraft);
        setEditingId(result.id);
        baselineSnapshotRef.current = JSON.stringify(normalizedDraft);
        setLastSavedAt(result.savedAt);
        updateAutoSaveStatus("Auto-saved", "success");
      } catch {
        updateAutoSaveStatus("Autosave failed", "danger");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canPersistServer,
    draft,
    editingId,
    isDirty,
    manualSaving,
    persistDraftToServer,
    saveLocalDraft,
    showEditor,
    validateDraft,
  ]);

  useEffect(() => {
    if (!showEditor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEditor, handleManualSave]);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    setEditingId(null);
    setDraft(EMPTY_EDITOR_DRAFT);
    setSlugManual(false);
    setFormError("");
  }, []);

  const openNewPost = useCallback(() => {
    openEditorWithDraft(EMPTY_EDITOR_DRAFT, null, false);
  }, [openEditorWithDraft]);

  const restoreLocalDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        draft?: EditorDraft;
        slugManual?: boolean;
      };
      if (!parsed?.draft) return;
      openEditorWithDraft(parsed.draft, null, Boolean(parsed.slugManual));
      setAutoSaveMessage("Restored local draft");
      setAutoSaveTone("success");
    } catch {
      setFormError("Could not restore local draft.");
    }
  }, [openEditorWithDraft, setFormError]);

  const handleEdit = useCallback((post: BlogPost) => {
    openEditorWithDraft(
      {
        title: post.payload.title,
        slug: post.payload.slug,
        content: post.payload.content,
        status: post.payload.status,
        tagsInput: (post.payload.tags || []).join(", "),
        seoDesc: post.payload.seo_description || "",
        coverImageUrl: post.payload.cover_image_url || "",
        publishedAt: post.payload.published_at,
      },
      post._id,
      true,
    );
  }, [openEditorWithDraft]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Delete this post? This action cannot be undone.")) {
      return;
    }
    setIsDeletingId(id);
    try {
      const response = await fetch(`/api/content/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Delete failed");
      }
      if (editingId === id) closeEditor();
      await fetchPosts();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete post";
      alert(message);
    } finally {
      setIsDeletingId(null);
    }
  }, [closeEditor, editingId, fetchPosts]);

  const handleStatusToggle = useCallback(async (post: BlogPost) => {
    setIsTogglingStatusId(post._id);
    try {
      const nextStatus: PostStatus =
        post.payload.status === "draft"
          ? "published"
          : post.payload.status === "published"
            ? "archived"
            : "draft";

      const payload = { ...post.payload, status: nextStatus };
      if (nextStatus === "published" && !post.payload.published_at) {
        payload.published_at = new Date().toISOString();
      }

      const response = await fetch(`/api/content/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Status toggle failed");
      }

      setPosts((previous) =>
        sortPostsByNewest(
          previous.map((item) =>
            item._id === post._id ? { ...item, payload } : item,
          ),
        ),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle status";
      alert(message);
    } finally {
      setIsTogglingStatusId(null);
    }
  }, [setPosts]);

  const applyInline = useCallback(
    (prefix: string, suffix = prefix, placeholder = "text") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = textarea.value;
      const selected = current.slice(start, end) || placeholder;
      const next = `${current.slice(0, start)}${prefix}${selected}${suffix}${current.slice(end)}`;

      setDraft((previous) => ({ ...previous, content: next }));

      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [],
  );

  const insertSnippet = useCallback((snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const prefix =
      start > 0 && !current.slice(0, start).endsWith("\n") ? "\n" : "";
    const suffix = current.slice(end).startsWith("\n") ? "" : "\n";
    const next = `${current.slice(0, start)}${prefix}${snippet}${suffix}${current.slice(end)}`;

    setDraft((previous) => ({ ...previous, content: next }));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + snippet.length,
      );
    });
  }, []);

  const toolbarItems = useMemo(
    () => [
      {
        label: "Bold",
        icon: Bold,
        action: () => applyInline("**", "**", "bold text"),
      },
      {
        label: "Italic",
        icon: Italic,
        action: () => applyInline("*", "*", "emphasis"),
      },
      {
        label: "Heading",
        icon: Heading2,
        action: () => insertSnippet("## Section heading"),
      },
      {
        label: "Quote",
        icon: Quote,
        action: () => insertSnippet("> Insightful quote"),
      },
      {
        label: "Code",
        icon: Code2,
        action: () => applyInline("\n```\n", "\n```\n", "const value = true;"),
      },
      {
        label: "Link",
        icon: Link2,
        action: () => applyInline("[", "](https://example.com)", "link label"),
      },
      {
        label: "List",
        icon: List,
        action: () =>
          insertSnippet("- First point\n- Second point\n- Third point"),
      },
      {
        label: "Numbered",
        icon: ListOrdered,
        action: () =>
          insertSnippet("1. First step\n2. Second step\n3. Third step"),
      },
    ],
    [applyInline, insertSnippet],
  );

  if (loading) {
    return <AdminModuleSkeleton />;
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <BlogAdminHeader
        stats={{
          published: stats.published,
          drafts: stats.drafts,
          archived: stats.archived,
        }}
      />

      <BlogAdminToolbar
        hasLocalDraft={hasLocalDraft}
        filteredCount={filteredPosts.length}
        search={search}
        showEditor={showEditor}
        onCreatePost={openNewPost}
        onRestoreLocalDraft={restoreLocalDraft}
        onSearchChange={setSearch}
      />

      <BlogEditor
        autoSaveMessage={autoSaveMessage}
        autoSaveTone={autoSaveTone}
        draft={draft}
        editingId={editingId}
        formError={formError}
        lastSavedAt={lastSavedAt}
        manualSaving={manualSaving}
        showEditor={showEditor}
        slugConflict={slugConflict}
        slugManual={slugManual}
        textareaRef={textareaRef}
        toolbarItems={toolbarItems}
        viewMode={viewMode}
        onClose={closeEditor}
        onSave={handleManualSave}
        onSetDraft={setDraft}
        onSetSlugManual={setSlugManual}
        onSetViewMode={setViewMode}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-2">
        {(["all", "draft", "published", "archived"] as StatusFilter[]).map(
          (item) => (
            <button
              key={item}
              onClick={() => setStatusFilter(item)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-medium capitalize transition-[color,background,border,transform]",
                statusFilter === item
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                "active:translate-y-px",
              )}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <BlogPostGrid
        posts={filteredPosts}
        loading={loading}
        isDeletingId={isDeletingId}
        isTogglingStatusId={isTogglingStatusId}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onToggleStatus={handleStatusToggle}
      />

      {!showEditor && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
          <p className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            The editor keeps local drafts safe before first save, then switches
            to server autosave once the post exists.
          </p>
        </div>
      )}

      {!showEditor && posts.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>Start with a draft and build your first post here.</p>
        </div>
      )}
    </div>
  );
}
