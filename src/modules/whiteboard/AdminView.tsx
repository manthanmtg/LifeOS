"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import {
    Plus, Trash2, Edit3, X, PenLine, ArrowLeft, Search, Loader2, Save,
    Star, Globe, Lock, Copy, Tag, ArrowUpDown, Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";
import WhiteboardPreview from "./WhiteboardPreview";

const Excalidraw = dynamic(
    async () => (await import("@excalidraw/excalidraw")).Excalidraw,
    { ssr: false }
);

type ColorLabel = "none" | "red" | "blue" | "green" | "yellow" | "purple" | "orange";
type SortOption = "updated" | "created" | "name" | "favorites";

interface ContentDoc {
    _id: string;
    module_type: string;
    is_public: boolean;
    payload: {
        name: string;
        description?: string;
        tags: string[];
        is_favorite: boolean;
        color_label: ColorLabel;
        elements: Record<string, unknown>[];
        app_state: Record<string, unknown>;
        files: Record<string, unknown>;
    };
    created_at: string;
    updated_at: string;
}

const COLOR_LABELS: { value: ColorLabel; dot: string; label: string }[] = [
    { value: "none", dot: "bg-zinc-600", label: "None" },
    { value: "red", dot: "bg-red-500", label: "Red" },
    { value: "blue", dot: "bg-blue-500", label: "Blue" },
    { value: "green", dot: "bg-emerald-500", label: "Green" },
    { value: "yellow", dot: "bg-yellow-500", label: "Yellow" },
    { value: "purple", dot: "bg-violet-500", label: "Purple" },
    { value: "orange", dot: "bg-orange-500", label: "Orange" },
];

const COLOR_BORDER: Record<string, string> = {
    none: "", red: "border-l-red-500/60", blue: "border-l-blue-500/60",
    green: "border-l-emerald-500/60", yellow: "border-l-yellow-500/60",
    purple: "border-l-violet-500/60", orange: "border-l-orange-500/60",
};

function relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function WhiteboardAdminView() {
    const [whiteboards, setWhiteboards] = useState<ContentDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // View state
    const [viewMode, setViewMode] = useState<"list" | "editor">("list");
    const [activeBoard, setActiveBoard] = useState<ContentDoc | null>(null);

    // Filters & sort
    const [searchQuery, setSearchQuery] = useState("");
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>("updated");
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newTags, setNewTags] = useState("");

    // Rename
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");

    // UI
    const [deleteTarget, setDeleteTarget] = useState<ContentDoc | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Editor tags editing
    const [editorTagInput, setEditorTagInput] = useState("");

    // Excalidraw
    const excalidrawApiRef = useRef<unknown>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string, type: ToastType) => {
        setToast({ message, type });
    }, []);

    // ── Data fetching ──
    const fetchWhiteboards = useCallback(async () => {
        try {
            const r = await fetch("/api/content?module_type=whiteboard_note");
            const d = await r.json();
            setWhiteboards((d.data || []) as ContentDoc[]);
        } catch {
            showToast("Failed to load whiteboards", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchWhiteboards(); }, [fetchWhiteboards]);
    useEffect(() => { return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }; }, []);

    // ── Derived data ──
    const allTags = useMemo(() => {
        const set = new Set(whiteboards.flatMap((w) => w.payload.tags || []));
        return Array.from(set).sort();
    }, [whiteboards]);

    const filteredBoards = useMemo(() => {
        let result = [...whiteboards];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((w) =>
                w.payload.name.toLowerCase().includes(q) ||
                (w.payload.description || "").toLowerCase().includes(q) ||
                w.payload.tags.some((t) => t.toLowerCase().includes(q))
            );
        }
        if (tagFilter) {
            result = result.filter((w) => w.payload.tags.includes(tagFilter));
        }
        if (favoritesOnly) {
            result = result.filter((w) => w.payload.is_favorite);
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case "name": return a.payload.name.localeCompare(b.payload.name);
                case "created": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case "favorites": {
                    if (a.payload.is_favorite !== b.payload.is_favorite) return a.payload.is_favorite ? -1 : 1;
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                }
                default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return result;
    }, [whiteboards, searchQuery, tagFilter, favoritesOnly, sortBy]);

    // ── CRUD helpers ──
    const updateBoard = async (id: string, updates: { payload?: Partial<ContentDoc["payload"]>; is_public?: boolean }) => {
        const board = whiteboards.find((w) => w._id === id);
        if (!board) return false;

        const body: Record<string, unknown> = {};
        if (updates.payload) body.payload = { ...board.payload, ...updates.payload };
        if (updates.is_public !== undefined) body.is_public = updates.is_public;

        try {
            const r = await fetch(`/api/content/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error();

            setWhiteboards((prev) => prev.map((w) => {
                if (w._id !== id) return w;
                return {
                    ...w,
                    ...(updates.is_public !== undefined ? { is_public: updates.is_public } : {}),
                    ...(updates.payload ? { payload: { ...w.payload, ...updates.payload } } : {}),
                };
            }));
            if (activeBoard?._id === id) {
                setActiveBoard((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        ...(updates.is_public !== undefined ? { is_public: updates.is_public } : {}),
                        ...(updates.payload ? { payload: { ...prev.payload, ...updates.payload } } : {}),
                    };
                });
            }
            return true;
        } catch {
            return false;
        }
    };

    const createWhiteboard = async () => {
        const name = newName.trim();
        if (!name) return;
        const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean);

        try {
            const r = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    module_type: "whiteboard_note",
                    is_public: false,
                    payload: { name, description: "", tags, is_favorite: false, color_label: "none", elements: [], app_state: {}, files: {} },
                }),
            });
            if (!r.ok) throw new Error();
            const d = await r.json();
            showToast("Whiteboard created", "success");
            setNewName("");
            setNewTags("");
            setShowCreate(false);
            await fetchWhiteboards();
            const created = d.data as ContentDoc;
            if (created) { setActiveBoard(created); setViewMode("editor"); }
        } catch {
            showToast("Failed to create whiteboard", "error");
        }
    };

    const duplicateBoard = async (board: ContentDoc) => {
        try {
            const r = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    module_type: "whiteboard_note",
                    is_public: false,
                    payload: { ...board.payload, name: `Copy of ${board.payload.name}`, is_favorite: false },
                }),
            });
            if (!r.ok) throw new Error();
            showToast("Whiteboard duplicated", "success");
            fetchWhiteboards();
        } catch {
            showToast("Failed to duplicate", "error");
        }
    };

    const handleDelete = async (board: ContentDoc) => {
        try {
            const r = await fetch(`/api/content/${board._id}`, { method: "DELETE" });
            if (!r.ok) throw new Error();
            setWhiteboards((prev) => prev.filter((w) => w._id !== board._id));
            if (activeBoard?._id === board._id) { setActiveBoard(null); setViewMode("list"); }
            showToast("Whiteboard deleted", "success");
        } catch {
            showToast("Failed to delete", "error");
        }
    };

    const handleRename = async (id: string) => {
        const name = renameValue.trim();
        if (!name) return;
        const ok = await updateBoard(id, { payload: { name } });
        if (ok) { setRenamingId(null); setRenameValue(""); }
        else showToast("Failed to rename", "error");
    };

    const toggleFavorite = async (board: ContentDoc) => {
        const ok = await updateBoard(board._id, { payload: { is_favorite: !board.payload.is_favorite } });
        if (!ok) showToast("Failed to update", "error");
    };

    const toggleVisibility = async (board: ContentDoc) => {
        const ok = await updateBoard(board._id, { is_public: !board.is_public });
        if (ok) showToast(board.is_public ? "Made private" : "Made public", "info");
        else showToast("Failed to update visibility", "error");
    };

    const setColorLabel = async (board: ContentDoc, color: ColorLabel) => {
        await updateBoard(board._id, { payload: { color_label: color } });
    };

    // ── Excalidraw save ──
    const saveWhiteboard = useCallback(async () => {
        if (!activeBoard || !excalidrawApiRef.current) return;

        const api = excalidrawApiRef.current as {
            getSceneElements: () => Record<string, unknown>[];
            getAppState: () => Record<string, unknown>;
            getFiles: () => Record<string, unknown>;
        };

        const elements = JSON.parse(JSON.stringify(
            api.getSceneElements().filter((el) => !(el as { isDeleted?: boolean }).isDeleted)
        ));
        const appState = api.getAppState() as Record<string, unknown>;
        const persistKeys = [
            "viewBackgroundColor", "currentItemStrokeColor", "currentItemBackgroundColor",
            "currentItemFillStyle", "currentItemStrokeWidth", "currentItemStrokeStyle",
            "currentItemRoughness", "currentItemOpacity", "currentItemFontFamily",
            "currentItemFontSize", "currentItemTextAlign", "currentItemStartArrowhead",
            "currentItemEndArrowhead", "currentItemRoundness", "gridSize", "gridStep",
            "gridModeEnabled", "zenModeEnabled", "viewModeEnabled",
            "scrollX", "scrollY", "zoom", "objectsSnapModeEnabled",
        ];
        const persistableState: Record<string, unknown> = {};
        for (const key of persistKeys) { if (key in appState) persistableState[key] = appState[key]; }

        let files: Record<string, unknown> = {};
        try {
            const rawFiles = api.getFiles();
            if (rawFiles && typeof rawFiles === "object") files = JSON.parse(JSON.stringify(rawFiles));
        } catch { /* skip */ }

        setSaving(true);
        try {
            const r = await fetch(`/api/content/${activeBoard._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payload: { ...activeBoard.payload, elements, app_state: persistableState, files },
                }),
            });
            if (!r.ok) throw new Error();

            setActiveBoard((prev) => prev ? { ...prev, payload: { ...prev.payload, elements, app_state: persistableState, files } } : prev);
            setWhiteboards((prev) => prev.map((w) =>
                w._id === activeBoard._id ? { ...w, payload: { ...w.payload, elements, app_state: persistableState, files }, updated_at: new Date().toISOString() } : w
            ));
        } catch {
            showToast("Failed to save whiteboard", "error");
        } finally {
            setSaving(false);
        }
    }, [activeBoard, showToast]);

    const handleChange = useCallback(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => { saveWhiteboard(); }, 3000);
    }, [saveWhiteboard]);

    const openBoard = (board: ContentDoc) => {
        if (activeBoard && excalidrawApiRef.current) saveWhiteboard();
        setActiveBoard(board);
        setEditorTagInput("");
        setViewMode("editor");
    };

    const goBackToList = async () => {
        if (activeBoard && excalidrawApiRef.current) await saveWhiteboard();
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        excalidrawApiRef.current = null;
        setActiveBoard(null);
        setViewMode("list");
        fetchWhiteboards();
    };

    // ── Editor tag management ──
    const addEditorTag = () => {
        if (!activeBoard || !editorTagInput.trim()) return;
        const tag = editorTagInput.trim().toLowerCase();
        if (activeBoard.payload.tags.includes(tag)) { setEditorTagInput(""); return; }
        const newTags = [...activeBoard.payload.tags, tag];
        updateBoard(activeBoard._id, { payload: { tags: newTags } });
        setEditorTagInput("");
    };

    const removeEditorTag = (tag: string) => {
        if (!activeBoard) return;
        const newTags = activeBoard.payload.tags.filter((t) => t !== tag);
        updateBoard(activeBoard._id, { payload: { tags: newTags } });
    };

    // ── Loading skeleton ──
    if (loading) {
        return (
            <div className="animate-fade-in-up space-y-6">
                <div className="h-10 w-48 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-12 bg-zinc-800/50 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-48 bg-zinc-800/30 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // ── EDITOR VIEW ──
    // ══════════════════════════════════════════════
    if (viewMode === "editor" && activeBoard) {
        return (
            <div className="animate-fade-in-up flex flex-col" style={{ height: "calc(100vh - 3rem)" }}>
                {/* Editor header */}
                <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={goBackToList} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-zinc-50 truncate">{activeBoard.payload.name}</h1>
                            <p className="text-[10px] text-zinc-600 font-medium">
                                {saving ? "Saving..." : "Auto-saves as you draw"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Visibility toggle */}
                        <button
                            onClick={() => toggleVisibility(activeBoard)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                                activeBoard.is_public
                                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                            )}
                            title={activeBoard.is_public ? "Public — click to make private" : "Private — click to make public"}
                        >
                            {activeBoard.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            {activeBoard.is_public ? "Public" : "Private"}
                        </button>
                        {/* Favorite */}
                        <button
                            onClick={() => toggleFavorite(activeBoard)}
                            className={cn(
                                "p-2 rounded-xl transition-all border",
                                activeBoard.payload.is_favorite
                                    ? "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                            )}
                            title={activeBoard.payload.is_favorite ? "Unfavorite" : "Favorite"}
                        >
                            <Star className="w-3.5 h-3.5" fill={activeBoard.payload.is_favorite ? "currentColor" : "none"} />
                        </button>
                        {/* Save */}
                        <button
                            onClick={saveWhiteboard}
                            disabled={saving}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                saving ? "bg-zinc-800 text-zinc-500" : "bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                            )}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </button>
                    </div>
                </div>

                {/* Editor tags bar */}
                <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    {activeBoard.payload.tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] font-medium">
                            {t}
                            <button onClick={() => removeEditorTag(t)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={editorTagInput}
                        onChange={(e) => setEditorTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEditorTag(); } }}
                        placeholder="Add tag..."
                        className="bg-transparent border-none text-xs text-zinc-400 placeholder:text-zinc-700 focus:outline-none w-24"
                    />
                </div>

                {/* Excalidraw Canvas */}
                <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-800 bg-white">
                    <Excalidraw
                        excalidrawAPI={(api: unknown) => { excalidrawApiRef.current = api; }}
                        initialData={{
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            elements: activeBoard.payload.elements as any,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            appState: { ...activeBoard.payload.app_state, theme: "dark" } as any,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            files: activeBoard.payload.files as any,
                        }}
                        onChange={handleChange}
                        theme="dark"
                    />
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // ── LIST VIEW ──
    // ══════════════════════════════════════════════
    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-accent/10 rounded-xl">
                            <PenLine className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Whiteboard</h1>
                    </div>
                    <p className="text-zinc-500 text-sm">
                        {whiteboards.length} whiteboard{whiteboards.length !== 1 ? "s" : ""} &mdash; draw, sketch, brainstorm
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                        showCreate
                            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            : "bg-zinc-50 text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-white/5"
                    )}
                >
                    {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showCreate ? "Cancel" : "New Whiteboard"}
                </button>
            </header>

            {/* Create Form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-sm space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sprint Planning, Architecture Sketch..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && createWhiteboard()}
                                    autoFocus
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Tags <span className="text-zinc-700">(comma-separated)</span></label>
                                <input
                                    type="text"
                                    placeholder="design, brainstorm, meeting..."
                                    value={newTags}
                                    onChange={(e) => setNewTags(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-accent/50 transition-colors text-sm"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={createWhiteboard}
                                    disabled={!newName.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-zinc-50 text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Create
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter bar */}
            {whiteboards.length > 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                    {/* Search + sort + favorites */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input
                                type="text"
                                placeholder="Search whiteboards..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/35 transition-colors"
                            />
                        </div>

                        <button
                            onClick={() => setFavoritesOnly(!favoritesOnly)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors inline-flex items-center gap-1.5",
                                favoritesOnly
                                    ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-300"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            <Star className="w-3.5 h-3.5" fill={favoritesOnly ? "currentColor" : "none"} /> Favorites
                        </button>

                        {/* Sort dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSortMenu(!showSortMenu)}
                                className="px-3 py-1.5 rounded-lg text-xs border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                {sortBy === "updated" ? "Last edited" : sortBy === "created" ? "Newest" : sortBy === "name" ? "Name" : "Favorites"}
                            </button>
                            {showSortMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                                        {([["updated", "Last edited"], ["created", "Newest first"], ["name", "Name A-Z"], ["favorites", "Favorites first"]] as [SortOption, string][]).map(([val, label]) => (
                                            <button
                                                key={val}
                                                onClick={() => { setSortBy(val); setShowSortMenu(false); }}
                                                className={cn(
                                                    "w-full px-4 py-2 text-left text-xs transition-colors",
                                                    sortBy === val ? "bg-accent/15 text-accent" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tag pills */}
                    {allTags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                            <button
                                onClick={() => setTagFilter(null)}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs border transition-colors",
                                    !tagFilter
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                )}
                            >
                                All
                            </button>
                            {allTags.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs border transition-colors",
                                        tagFilter === t
                                            ? "bg-accent/15 border-accent/35 text-accent"
                                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Grid */}
            {filteredBoards.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                        <PenLine className="w-7 h-7 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 font-medium">
                        {searchQuery || tagFilter || favoritesOnly ? "No whiteboards match your filters" : "No whiteboards yet"}
                    </p>
                    {!searchQuery && !tagFilter && !favoritesOnly && (
                        <p className="text-zinc-600 text-sm mt-1">Create your first whiteboard to start drawing</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredBoards.map((board) => {
                            const isRenaming = renamingId === board._id;
                            const elementCount = board.payload.elements?.length || 0;
                            const colorBorder = COLOR_BORDER[board.payload.color_label || "none"];

                            return (
                                <motion.div
                                    key={board._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => !isRenaming && openBoard(board)}
                                    className={cn(
                                        "group relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all cursor-pointer",
                                        "hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01]",
                                        colorBorder && `border-l-[3px] ${colorBorder}`
                                    )}
                                >
                                    {/* Top badges */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                                        {board.payload.is_favorite && (
                                            <div className="p-1 rounded-md bg-yellow-500/15" title="Favorite">
                                                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                                            </div>
                                        )}
                                        {board.is_public && (
                                            <div className="p-1 rounded-md bg-emerald-500/15" title="Public">
                                                <Globe className="w-3 h-3 text-emerald-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover actions */}
                                    <div
                                        className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button onClick={() => toggleFavorite(board)} className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-yellow-500/20 text-zinc-400 hover:text-yellow-400 transition-colors" title="Favorite">
                                            <Star className="w-3.5 h-3.5" fill={board.payload.is_favorite ? "currentColor" : "none"} />
                                        </button>
                                        <button onClick={() => toggleVisibility(board)} className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors" title={board.is_public ? "Make private" : "Make public"}>
                                            {board.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={() => duplicateBoard(board)} className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors" title="Duplicate">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        {/* Color label picker */}
                                        <div className="relative group/color">
                                            <button className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors" title="Color label">
                                                <div className={cn("w-3.5 h-3.5 rounded-full border border-zinc-600", COLOR_LABELS.find((c) => c.value === board.payload.color_label)?.dot || "bg-zinc-600")} />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 hidden group-hover/color:flex bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 gap-1.5 z-50">
                                                {COLOR_LABELS.map((c) => (
                                                    <button
                                                        key={c.value}
                                                        onClick={() => setColorLabel(board, c.value)}
                                                        className={cn("w-5 h-5 rounded-full transition-all", c.dot, board.payload.color_label === c.value ? "ring-2 ring-white/40 scale-110" : "hover:scale-110 opacity-70 hover:opacity-100")}
                                                        title={c.label}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => { setRenamingId(board._id); setRenameValue(board.payload.name); }} className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors" title="Rename">
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setDeleteTarget(board)} className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Canvas preview */}
                                    <div className="h-36 rounded-xl bg-zinc-950/60 border border-zinc-800/50 mb-4 flex items-center justify-center overflow-hidden">
                                        <WhiteboardPreview elements={board.payload.elements} files={board.payload.files} />
                                    </div>

                                    {/* Name */}
                                    {isRenaming ? (
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(board._id); if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); } }}
                                                autoFocus
                                                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-accent/50"
                                            />
                                            <button onClick={() => handleRename(board._id)} className="p-1.5 rounded-lg bg-zinc-50 text-zinc-950 hover:bg-zinc-200">
                                                <Save className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <h3 className="font-semibold text-zinc-100 truncate">{board.payload.name}</h3>
                                    )}

                                    {/* Description */}
                                    {board.payload.description && (
                                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{board.payload.description}</p>
                                    )}

                                    {/* Tags + meta row */}
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                            {board.payload.tags.slice(0, 3).map((t) => (
                                                <span key={t} className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded-md font-medium">{t}</span>
                                            ))}
                                            {board.payload.tags.length > 3 && (
                                                <span className="text-[10px] text-zinc-600">+{board.payload.tags.length - 3}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-600 shrink-0">
                                            {elementCount > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Shapes className="w-3 h-3" /> {elementCount}
                                                </span>
                                            )}
                                            <span title={new Date(board.updated_at).toLocaleString()}>
                                                {relativeTime(board.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Delete confirmation */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Whiteboard"
                description={`Are you sure you want to delete "${deleteTarget?.payload.name}"? All drawings will be lost permanently.`}
                confirmLabel="Delete"
                onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
            />

            {toast && (
                <Toast message={toast.message} type={toast.type} isVisible={!!toast} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
