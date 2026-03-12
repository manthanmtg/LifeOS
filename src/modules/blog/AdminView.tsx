"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Bold,
    Clock3,
    Code2,
    Edit3,
    Eye,
    EyeOff,
    FileText,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    Plus,
    Quote,
    RefreshCw,
    Save,
    Search,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownPreview from "@/modules/blog/MarkdownPreview";
import { BlogPayload, BlogPost, PostStatus } from "@/modules/blog/types";
import { estimateReadingTime, formatPostDate, slugify, wordCount } from "@/modules/blog/utils";

const STATUS_STYLES: Record<PostStatus, string> = {
    draft: "bg-yellow-500/15 text-yellow-400",
    published: "bg-green-500/15 text-green-400",
    archived: "bg-zinc-500/15 text-zinc-400",
};

interface EditorDraft {
    title: string;
    slug: string;
    content: string;
    status: PostStatus;
    tagsInput: string;
    seoDesc: string;
    coverImageUrl: string;
    publishedAt?: string;
}

type StatusFilter = "all" | PostStatus;
type ViewMode = "split" | "write" | "preview";

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

function parseTags(tagsInput: string): string[] {
    return tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

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
    const [autoSaveTone, setAutoSaveTone] = useState<"muted" | "success" | "danger">("muted");
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [formError, setFormError] = useState("");
    const [hasLocalDraft, setHasLocalDraft] = useState(false);

    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isTogglingStatusId, setIsTogglingStatusId] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const baselineSnapshotRef = useRef<string>(JSON.stringify(EMPTY_EDITOR_DRAFT));

    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=blog_post");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch posts");
            setPosts(data.data || []);
        } catch (err: unknown) {
            console.error("fetchPosts failed:", err);
            setFormError("Failed to load posts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    useEffect(() => {
        if (!showEditor || slugManual) return;
        setDraft((prev) => {
            const nextSlug = slugify(prev.title);
            if (nextSlug === prev.slug) return prev;
            return { ...prev, slug: nextSlug };
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

    const openEditorWithDraft = useCallback((nextDraft: EditorDraft, nextId: string | null, manualSlug: boolean) => {
        setDraft(nextDraft);
        setEditingId(nextId);
        setSlugManual(manualSlug);
        setShowEditor(true);
        setViewMode("split");
        setFormError("");
        setAutoSaveMessage("Idle");
        setAutoSaveTone("muted");
        baselineSnapshotRef.current = JSON.stringify(nextDraft);
    }, []);

    const openNewPost = () => {
        openEditorWithDraft(EMPTY_EDITOR_DRAFT, null, false);
    };

    const restoreLocalDraft = () => {
        if (typeof window === "undefined") return;
        try {
            const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { draft?: EditorDraft; slugManual?: boolean };
            if (!parsed?.draft) return;
            openEditorWithDraft(parsed.draft, null, Boolean(parsed.slugManual));
            setAutoSaveMessage("Restored local draft");
            setAutoSaveTone("success");
        } catch {
            setFormError("Could not restore local draft.");
        }
    };

    const closeEditor = () => {
        setShowEditor(false);
        setEditingId(null);
        setDraft(EMPTY_EDITOR_DRAFT);
        setSlugManual(false);
        setFormError("");
    };

    const isSlugTaken = useCallback((slug: string) => {
        const normalized = slug.trim().toLowerCase();
        if (!normalized) return false;
        return posts.some((post) => post.payload.slug.toLowerCase() === normalized && post._id !== editingId);
    }, [posts, editingId]);

    const slugConflict = showEditor && isSlugTaken(draft.slug);
    const draftSnapshot = JSON.stringify(draft);
    const isDirty = showEditor && draftSnapshot !== baselineSnapshotRef.current;
    const canPersistServer = Boolean(draft.title.trim() && draft.slug.trim() && draft.content.trim());

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        const ranked = [...posts].sort((a, b) => {
            const aDate = new Date(a.payload.published_at || a.created_at).getTime();
            const bDate = new Date(b.payload.published_at || b.created_at).getTime();
            return bDate - aDate;
        });

        return ranked.filter((post) => {
            if (statusFilter !== "all" && post.payload.status !== statusFilter) return false;
            if (!query) return true;
            const haystack = `${post.payload.title} ${post.payload.slug} ${(post.payload.tags || []).join(" ")}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [posts, search, statusFilter]);

    const stats = useMemo(() => {
        const published = posts.filter((post) => post.payload.status === "published").length;
        const drafts = posts.filter((post) => post.payload.status === "draft").length;
        const archived = posts.filter((post) => post.payload.status === "archived").length;
        return { published, drafts, archived };
    }, [posts]);

    const upsertPostLocally = useCallback((id: string, payload: BlogPayload, savedAt: string) => {
        setPosts((prev) => {
            const index = prev.findIndex((post) => post._id === id);
            if (index === -1) return prev;
            const updated = [...prev];
            updated[index] = { ...updated[index], payload, updated_at: savedAt };
            return updated;
        });
    }, []);

    const persistDraftToServer = useCallback(async (mode: "manual" | "autosave") => {
        const savedAt = new Date().toISOString();
        const payload: BlogPayload = {
            title: draft.title.trim(),
            slug: draft.slug.trim(),
            content: draft.content,
            status: draft.status,
            tags: parseTags(draft.tagsInput),
            estimated_reading_time: estimateReadingTime(draft.content),
            seo_description: draft.seoDesc.trim() || undefined,
            cover_image_url: draft.coverImageUrl.trim() || undefined,
        };

        if (payload.status === "published") {
            payload.published_at = draft.publishedAt || savedAt;
        }

        if (editingId) {
            const res = await fetch(`/api/content/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            if (!res.ok) throw new Error("Save failed");
            upsertPostLocally(editingId, payload, savedAt);
            return { id: editingId, payload, savedAt };
        }

        const res = await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ module_type: "blog_post", is_public: true, payload }),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        const id = String(data.data?._id || data.data?.insertedId);
        if (mode === "manual") {
            await fetchPosts();
        } else {
            setPosts((prev) => [
                {
                    _id: id,
                    payload,
                    created_at: savedAt,
                    updated_at: savedAt,
                },
                ...prev,
            ]);
        }
        return { id, payload, savedAt };
    }, [draft, editingId, fetchPosts, upsertPostLocally]);

    const validateDraft = useCallback((strict: boolean): string | null => {
        if (!draft.title.trim()) return "Title is required.";
        if (!draft.slug.trim()) return "Slug is required.";
        if (isSlugTaken(draft.slug)) return "Slug already exists.";
        if (strict && !draft.content.trim()) return "Content is required.";
        if (draft.seoDesc.length > 160) return "SEO description should be 160 characters or less.";
        if (draft.coverImageUrl.trim() && !isValidHttpUrl(draft.coverImageUrl.trim())) return "Cover image URL must be valid.";
        return null;
    }, [draft, isSlugTaken]);

    const updateAutoSaveStatus = (text: string, tone: "muted" | "success" | "danger") => {
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
                })
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
        } catch { }
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
                updateAutoSaveStatus(validation.includes("Slug") ? "Autosave paused: slug issue" : "Autosave waiting for required fields", "danger");
                return;
            }
            if (!canPersistServer) {
                updateAutoSaveStatus("Autosave waiting for title, slug, and content", "muted");
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
    }, [showEditor, isDirty, manualSaving, editingId, draft, canPersistServer, saveLocalDraft, persistDraftToServer, validateDraft]);

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

    const handleEdit = (post: BlogPost) => {
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
            true
        );
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this post? This action cannot be undone.")) return;
        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            if (editingId === id) closeEditor();
            await fetchPosts();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete post";
            alert(message);
        } finally {
            setIsDeletingId(null);
        }
    };

    const handleStatusToggle = async (post: BlogPost) => {
        setIsTogglingStatusId(post._id);
        try {
            const nextStatus: PostStatus =
                post.payload.status === "draft" ? "published" : post.payload.status === "published" ? "archived" : "draft";
            const payload = { ...post.payload, status: nextStatus };
            if (nextStatus === "published" && !post.payload.published_at) payload.published_at = new Date().toISOString();

            const res = await fetch(`/api/content/${post._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Status toggle failed");

            setPosts((prev) => prev.map((item) => item._id === post._id ? { ...item, payload } : item));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to toggle status";
            alert(message);
        } finally {
            setIsTogglingStatusId(null);
        }
    };

    const applyInline = useCallback((prefix: string, suffix = prefix, placeholder = "text") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = textarea.value;
        const selected = current.slice(start, end) || placeholder;
        const next = `${current.slice(0, start)}${prefix}${selected}${suffix}${current.slice(end)}`;

        setDraft((prev) => ({ ...prev, content: next }));

        const cursorStart = start + prefix.length;
        const cursorEnd = cursorStart + selected.length;
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(cursorStart, cursorEnd);
        });
    }, []);

    const insertSnippet = useCallback((snippet: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = textarea.value;
        const prefix = start > 0 && !current.slice(0, start).endsWith("\n") ? "\n" : "";
        const suffix = current.slice(end).startsWith("\n") ? "" : "\n";
        const next = `${current.slice(0, start)}${prefix}${snippet}${suffix}${current.slice(end)}`;

        setDraft((prev) => ({ ...prev, content: next }));
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + snippet.length);
        });
    }, []);

    const toolbarItems = [
        { label: "Bold", icon: Bold, action: () => applyInline("**", "**", "bold text") },
        { label: "Italic", icon: Italic, action: () => applyInline("*", "*", "emphasis") },
        { label: "Heading", icon: Heading2, action: () => insertSnippet("## Section heading") },
        { label: "Quote", icon: Quote, action: () => insertSnippet("> Insightful quote") },
        { label: "Code", icon: Code2, action: () => applyInline("\n```\n", "\n```\n", "const value = true;") },
        { label: "Link", icon: Link2, action: () => applyInline("[", "](https://example.com)", "link label") },
        { label: "List", icon: List, action: () => insertSnippet("- First point\n- Second point\n- Third point") },
        { label: "Numbered", icon: ListOrdered, action: () => insertSnippet("1. First step\n2. Second step\n3. Third step") },
    ] as const;

    const words = wordCount(draft.content);
    const readTime = estimateReadingTime(draft.content);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-10 right-0 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Blog Studio</h1>
                    <p className="text-zinc-400 mt-1">Rich markdown authoring with live preview, keyboard shortcuts, and autosave.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5 md:max-w-xl">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                        <p className="text-lg font-semibold text-zinc-100">{stats.published}</p>
                        <p className="text-xs text-zinc-500">Published</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                        <p className="text-lg font-semibold text-zinc-100">{stats.drafts}</p>
                        <p className="text-xs text-zinc-500">Drafts</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                        <p className="text-lg font-semibold text-zinc-100">{stats.archived}</p>
                        <p className="text-xs text-zinc-500">Archived</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={openNewPost}
                    aria-label="Create new post"
                    className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> New Post
                </button>
                {hasLocalDraft && !showEditor && (
                    <button
                        onClick={restoreLocalDraft}
                        aria-label="Restore previous local draft"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" /> Restore local draft
                    </button>
                )}
                <div className="ml-auto flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search posts..."
                            aria-label="Search blog posts"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">{filtered.length} post{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {showEditor && (
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-100">{editingId ? "Edit Post" : "Compose Post"}</h2>
                            <p className="text-xs text-zinc-500 mt-1">
                                {words} words • {readTime} min read
                                {lastSavedAt ? ` • Last saved ${new Date(lastSavedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            <div className={cn(
                                "text-xs px-2.5 py-1 rounded-full border",
                                autoSaveTone === "success" && "border-green-500/30 bg-green-500/10 text-green-300",
                                autoSaveTone === "danger" && "border-red-500/30 bg-red-500/10 text-red-300",
                                autoSaveTone === "muted" && "border-zinc-700 bg-zinc-800 text-zinc-400"
                            )}>
                                {autoSaveMessage}
                            </div>
                            <button
                                onClick={closeEditor}
                                aria-label="Close editor"
                                title="Close editor"
                                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleManualSave}
                                disabled={manualSaving || slugConflict}
                                aria-label={editingId ? "Save post changes" : "Publish new post"}
                                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                            >
                                {manualSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {manualSaving ? "Saving..." : "Save Post"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Title</label>
                            <input
                                type="text"
                                value={draft.title}
                                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="A clear, specific title..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5">Slug</label>
                            <input
                                type="text"
                                value={draft.slug}
                                aria-label="Post slug"
                                onChange={(e) => {
                                    setDraft((prev) => ({ ...prev, slug: e.target.value }));
                                    setSlugManual(true);
                                }}
                                className={cn(
                                    "w-full bg-zinc-800 border rounded-lg px-4 py-2.5 text-sm text-zinc-50 font-mono focus:outline-none focus:ring-2 focus:ring-accent/40",
                                    slugConflict ? "border-red-500/50" : "border-zinc-700"
                                )}
                            />
                            {slugConflict && <p className="text-xs text-red-400 mt-1">Slug already exists.</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {(["split", "write", "preview"] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                                    viewMode === mode ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {mode}
                            </button>
                        ))}
                        <span className="text-xs text-zinc-500 ml-auto">Shortcut: Ctrl/Cmd + S to save</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {toolbarItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                disabled={viewMode === "preview"}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-zinc-100 disabled:opacity-40 transition-colors text-xs"
                            >
                                <item.icon className="w-3.5 h-3.5" /> {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
                        <div className="space-y-4">
                            {viewMode !== "preview" && (
                                <textarea
                                    ref={textareaRef}
                                    value={draft.content}
                                    onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
                                    rows={16}
                                    placeholder="Write your post in Markdown..."
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono resize-y"
                                />
                            )}
                            {viewMode !== "write" && (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 min-h-[22rem]">
                                    {draft.content.trim() ? (
                                        <MarkdownPreview content={draft.content} />
                                    ) : (
                                        <p className="text-sm text-zinc-500">Live preview appears here as you write.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                                <p className="text-xs uppercase tracking-wide text-zinc-500">Publishing</p>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1.5">Status</label>
                                    <select
                                        value={draft.status}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as PostStatus }))}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1.5">Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={draft.tagsInput}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, tagsInput: e.target.value }))}
                                        placeholder="react, nextjs, ux"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                                        <span>SEO description</span>
                                        <span className={draft.seoDesc.length > 160 ? "text-red-400" : ""}>{draft.seoDesc.length}/160</span>
                                    </label>
                                    <textarea
                                        value={draft.seoDesc}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, seoDesc: e.target.value }))}
                                        rows={3}
                                        placeholder="Search snippet for this post..."
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1.5">Cover image URL</label>
                                    <input
                                        type="url"
                                        value={draft.coverImageUrl}
                                        onChange={(e) => setDraft((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                                        placeholder="https://..."
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                                <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Readability</p>
                                <div className="space-y-1.5 text-sm">
                                    <p className="text-zinc-300 flex items-center justify-between">
                                        <span>Word count</span>
                                        <span className="font-medium text-zinc-100">{words}</span>
                                    </p>
                                    <p className="text-zinc-300 flex items-center justify-between">
                                        <span>Estimated read</span>
                                        <span className="font-medium text-zinc-100">{readTime} min</span>
                                    </p>
                                    <p className="text-zinc-300 flex items-center justify-between">
                                        <span>Auto slug</span>
                                        <span className="font-medium text-zinc-100">{slugManual ? "Manual" : "Enabled"}</span>
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {formError && (
                        <div className="rounded-xl border border-red-500/25 bg-red-500/10 text-red-300 text-sm px-3 py-2">
                            {formError}
                        </div>
                    )}
                </section>
            )}

            <div className="flex items-center gap-2">
                {(["all", "draft", "published", "archived"] as StatusFilter[]).map((item) => (
                    <button
                        key={item}
                        onClick={() => setStatusFilter(item)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                            statusFilter === item ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center text-zinc-500 py-12">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No posts found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map((post) => (
                        <article
                            key={post._id}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-zinc-100 truncate">{post.payload.title}</p>
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_STYLES[post.payload.status])}>
                                            {post.payload.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-500 mt-1">
                                        <span className="font-mono">/{post.payload.slug}</span>
                                        <span className="inline-flex items-center gap-1">
                                            <Clock3 className="w-3.5 h-3.5" />
                                            {post.payload.estimated_reading_time || estimateReadingTime(post.payload.content)} min
                                        </span>
                                        <span>{formatPostDate(post.payload.published_at || post.created_at)}</span>
                                    </div>
                                    {post.payload.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {post.payload.tags.slice(0, 4).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 text-[11px] rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => handleStatusToggle(post)}
                                        disabled={isTogglingStatusId === post._id}
                                        aria-label={post.payload.status === "published" ? "Archive post" : "Publish post"}
                                        title={post.payload.status === "published" ? "Archive post" : "Publish post"}
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        {isTogglingStatusId === post._id ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : post.payload.status === "published" ? (
                                            <EyeOff className="w-3.5 h-3.5" />
                                        ) : (
                                            <Eye className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(post)}
                                        disabled={isDeletingId === post._id || isTogglingStatusId === post._id}
                                        aria-label="Edit post"
                                        title="Edit post"
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(post._id)}
                                        disabled={isDeletingId === post._id}
                                        aria-label="Delete post"
                                        title="Delete post"
                                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        {isDeletingId === post._id ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {!showEditor && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
                    <p className="inline-flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        Rich editor includes markdown toolbar, live preview, and autosave (local for new drafts, server for saved posts).
                    </p>
                </div>
            )}
        </div>
    );
}
