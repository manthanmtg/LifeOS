"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import {
  Plus,
  X,
  PenLine,
  ArrowLeft,
  Search,
  Loader2,
  Save,
  Star,
  Globe,
  Lock,
  Tag,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast, { type ToastType } from "@/components/ui/Toast";
import WhiteboardCard from "./WhiteboardCard";
import { SkeletonBlock, AdminModuleSkeleton } from "@/components/ui/Skeletons";
import {
  toExcalidrawAppState,
  toExcalidrawElements,
  toExcalidrawFiles,
} from "./types";
import type { ExcalidrawApi, ExcalidrawAppState } from "./types";
import {
  type ColorLabel,
  type SortOption,
  type ContentDoc,
  relativeTime,
  formatDateTime,
} from "./utils";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 w-full h-full bg-zinc-900 flex items-center justify-center">
        <div className="w-full h-full p-8 space-y-4">
          <SkeletonBlock className="w-full h-full rounded-xl opacity-20" />
        </div>
      </div>
    ),
  },
);

export default function WhiteboardAdminView() {
  const [now] = useState(() => Date.now());
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
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Editor tags editing
  const [editorTagInput, setEditorTagInput] = useState("");

  // Excalidraw
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
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

  useEffect(() => {
    fetchWhiteboards();
  }, [fetchWhiteboards]);
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ── Derived data ──
  const allTags = useMemo(() => {
    const set = new Set(whiteboards.flatMap((w) => w.payload.tags || []));
    return Array.from(set).sort();
  }, [whiteboards]);

  const filteredBoards = useMemo(() => {
    let result = [...whiteboards];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.payload.name.toLowerCase().includes(q) ||
          (w.payload.description || "").toLowerCase().includes(q) ||
          w.payload.tags.some((t) => t.toLowerCase().includes(q)),
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
        case "name":
          return a.payload.name.localeCompare(b.payload.name);
        case "created":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "favorites": {
          if (a.payload.is_favorite !== b.payload.is_favorite)
            return a.payload.is_favorite ? -1 : 1;
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        }
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      }
    });

    return result;
  }, [whiteboards, searchQuery, tagFilter, favoritesOnly, sortBy]);

  const boardUpdatedMeta = useMemo(() => {
    return new Map(
      whiteboards.map((board) => [
        board._id,
        {
          title: formatDateTime(board.updated_at),
          relative: relativeTime(board.updated_at, now),
        },
      ]),
    );
  }, [whiteboards, now]);

  // ── CRUD helpers ──
  const updateBoard = async (
    id: string,
    updates: { payload?: Partial<ContentDoc["payload"]>; is_public?: boolean },
  ) => {
    const board = whiteboards.find((w) => w._id === id);
    if (!board) return false;

    const body: Record<string, unknown> = {};
    if (updates.payload)
      body.payload = { ...board.payload, ...updates.payload };
    if (updates.is_public !== undefined) body.is_public = updates.is_public;

    try {
      const r = await fetch(`/api/content/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();

      setWhiteboards((prev) =>
        prev.map((w) => {
          if (w._id !== id) return w;
          return {
            ...w,
            ...(updates.is_public !== undefined
              ? { is_public: updates.is_public }
              : {}),
            ...(updates.payload
              ? { payload: { ...w.payload, ...updates.payload } }
              : {}),
          };
        }),
      );
      if (activeBoard?._id === id) {
        setActiveBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(updates.is_public !== undefined
              ? { is_public: updates.is_public }
              : {}),
            ...(updates.payload
              ? { payload: { ...prev.payload, ...updates.payload } }
              : {}),
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
    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "whiteboard_note",
          is_public: false,
          payload: {
            name,
            description: "",
            tags,
            is_favorite: false,
            color_label: "none",
            elements: [],
            app_state: {},
            files: {},
          },
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
      if (created) {
        setActiveBoard(created);
        setViewMode("editor");
      }
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
          payload: {
            ...board.payload,
            name: `Copy of ${board.payload.name}`,
            is_favorite: false,
          },
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
      if (activeBoard?._id === board._id) {
        setActiveBoard(null);
        setViewMode("list");
      }
      showToast("Whiteboard deleted", "success");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    const ok = await updateBoard(id, { payload: { name } });
    if (ok) {
      setRenamingId(null);
      setRenameValue("");
    } else showToast("Failed to rename", "error");
  };

  const toggleFavorite = async (board: ContentDoc) => {
    const ok = await updateBoard(board._id, {
      payload: { is_favorite: !board.payload.is_favorite },
    });
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

    const api = excalidrawApiRef.current;

    const elements = JSON.parse(
      JSON.stringify(
        api
          .getSceneElements()
          .filter((el) => !(el as { isDeleted?: boolean }).isDeleted),
      ),
    ) as ContentDoc["payload"]["elements"];
    const appState = api.getAppState() as Record<string, unknown>;
    const persistKeys = [
      "viewBackgroundColor",
      "currentItemStrokeColor",
      "currentItemBackgroundColor",
      "currentItemFillStyle",
      "currentItemStrokeWidth",
      "currentItemStrokeStyle",
      "currentItemRoughness",
      "currentItemOpacity",
      "currentItemFontFamily",
      "currentItemFontSize",
      "currentItemTextAlign",
      "currentItemStartArrowhead",
      "currentItemEndArrowhead",
      "currentItemRoundness",
      "gridSize",
      "gridStep",
      "gridModeEnabled",
      "zenModeEnabled",
      "viewModeEnabled",
      "scrollX",
      "scrollY",
      "zoom",
      "objectsSnapModeEnabled",
    ];
    const persistableState: Record<string, unknown> = {};
    for (const key of persistKeys) {
      if (key in appState) persistableState[key] = appState[key];
    }

    let files: Record<string, unknown> = {};
    try {
      const rawFiles = api.getFiles();
      if (rawFiles && typeof rawFiles === "object")
        files = JSON.parse(JSON.stringify(rawFiles));
    } catch {
      /* skip */
    }

    setSaving(true);
    try {
      const r = await fetch(`/api/content/${activeBoard._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...activeBoard.payload,
            elements,
            app_state: persistableState,
            files,
          },
        }),
      });
      if (!r.ok) throw new Error();

      setActiveBoard((prev) =>
        prev
          ? {
              ...prev,
              payload: {
                ...prev.payload,
                elements,
                app_state: persistableState,
                files,
              },
            }
          : prev,
      );
      setWhiteboards((prev) =>
        prev.map((w) =>
          w._id === activeBoard._id
            ? {
                ...w,
                payload: {
                  ...w.payload,
                  elements,
                  app_state: persistableState,
                  files,
                },
                updated_at: new Date().toISOString(),
              }
            : w,
        ),
      );
    } catch {
      showToast("Failed to save whiteboard", "error");
    } finally {
      setSaving(false);
    }
  }, [activeBoard, showToast]);

  const handleChange = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveWhiteboard();
    }, 3000);
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
    if (activeBoard.payload.tags.includes(tag)) {
      setEditorTagInput("");
      return;
    }
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
  if (loading) return <AdminModuleSkeleton withHeader={false} />;

  // ══════════════════════════════════════════════
  // ── EDITOR VIEW ──
  // ══════════════════════════════════════════════
  if (viewMode === "editor" && activeBoard) {
    return (
      <div
        className="animate-fade-in-up flex flex-col"
        style={{ height: "calc(100vh - 3rem)" }}
      >
        {/* Editor header */}
        <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={goBackToList}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-zinc-50 truncate">
                {activeBoard.payload.name}
              </h1>
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
                  ? "bg-success/10 border-success/25 text-success"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300",
              )}
              title={
                activeBoard.is_public
                  ? "Public — click to make private"
                  : "Private — click to make public"
              }
            >
              {activeBoard.is_public ? (
                <Globe className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              {activeBoard.is_public ? "Public" : "Private"}
            </button>
            {/* Favorite */}
            <button
              onClick={() => toggleFavorite(activeBoard)}
              className={cn(
                "p-2 rounded-xl transition-all border",
                activeBoard.payload.is_favorite
                  ? "bg-warning/10 border-warning/25 text-warning"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300",
              )}
              title={
                activeBoard.payload.is_favorite ? "Unfavorite" : "Favorite"
              }
            >
              <Star
                className="w-3.5 h-3.5"
                fill={activeBoard.payload.is_favorite ? "currentColor" : "none"}
              />
            </button>
            {/* Save */}
            <button
              onClick={saveWhiteboard}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                saving
                  ? "bg-zinc-800 text-zinc-500"
                  : "bg-zinc-50 text-zinc-950 hover:bg-zinc-200",
              )}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>

        {/* Editor tags bar */}
        <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          {activeBoard.payload.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] font-medium"
            >
              {t}
              <button
                onClick={() => removeEditorTag(t)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={editorTagInput}
            onChange={(e) => setEditorTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addEditorTag();
              }
            }}
            placeholder="Add tag..."
            className="bg-transparent border-none text-xs text-zinc-400 placeholder:text-zinc-700 focus:outline-none w-24"
          />
        </div>

        {/* Excalidraw Canvas */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
          <Excalidraw
            excalidrawAPI={(api: ExcalidrawApi) => {
              excalidrawApiRef.current = api;
            }}
            initialData={{
              elements: toExcalidrawElements(activeBoard.payload.elements),
              appState: {
                ...toExcalidrawAppState(activeBoard.payload.app_state),
                theme: "dark",
              } as ExcalidrawAppState,

              files: toExcalidrawFiles(activeBoard.payload.files) ?? null,
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
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              Whiteboard
            </h1>
          </div>
          <p className="text-zinc-500 text-sm">
            {whiteboards.length} whiteboard{whiteboards.length !== 1 ? "s" : ""}{" "}
            &mdash; draw, sketch, brainstorm
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
            showCreate
              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              : "bg-zinc-50 text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-zinc-200/20",
          )}
        >
          {showCreate ? (
            <X className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {showCreate ? "Cancel" : "New Whiteboard"}
        </button>
      </header>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-sm space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Name
                </label>
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Tags <span className="text-zinc-700">(comma-separated)</span>
                </label>
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
                  ? "bg-warning/15 border-warning/30 text-warning"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
              )}
            >
              <Star
                className="w-3.5 h-3.5"
                fill={favoritesOnly ? "currentColor" : "none"}
              />{" "}
              Favorites
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="px-3 py-1.5 rounded-lg text-xs border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortBy === "updated"
                  ? "Last edited"
                  : sortBy === "created"
                    ? "Newest"
                    : sortBy === "name"
                      ? "Name"
                      : "Favorites"}
              </button>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                    {(
                      [
                        ["updated", "Last edited"],
                        ["created", "Newest first"],
                        ["name", "Name A-Z"],
                        ["favorites", "Favorites first"],
                      ] as [SortOption, string][]
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => {
                          setSortBy(val);
                          setShowSortMenu(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-xs transition-colors",
                          sortBy === val
                            ? "bg-accent/15 text-accent"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
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
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
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
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300",
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
            {searchQuery || tagFilter || favoritesOnly
              ? "No whiteboards match your filters"
              : "No whiteboards yet"}
          </p>
          {!searchQuery && !tagFilter && !favoritesOnly && (
            <p className="text-zinc-600 text-sm mt-1">
              Create your first whiteboard to start drawing
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredBoards.map((board) => (
              <WhiteboardCard
                key={board._id}
                board={board}
                isRenaming={renamingId === board._id}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                handleRename={handleRename}
                setRenamingId={setRenamingId}
                openBoard={openBoard}
                toggleFavorite={toggleFavorite}
                toggleVisibility={toggleVisibility}
                duplicateBoard={duplicateBoard}
                setColorLabel={setColorLabel}
                setDeleteTarget={setDeleteTarget}
                updatedMeta={boardUpdatedMeta.get(board._id)}
              />
            ))}
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
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
