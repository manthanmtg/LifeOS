"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Settings, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import type { Snippet, SnippetStats } from "./components/types";
import { SNIPPET_DEFAULTS, LANGUAGES } from "./components/types";
import SnippetsMetrics from "./components/SnippetsMetrics";
import SnippetsFilters from "./components/SnippetsFilters";
import SnippetCard from "./components/SnippetCard";
import SnippetForm from "./components/SnippetForm";
import SnippetsSettings from "./components/SnippetsSettings";

export default function SnippetsAdminView() {
  const {
    settings,
    updateSettings,
    saving: settingsSaving,
  } = useModuleSettings("snippetSettings", SNIPPET_DEFAULTS);

  const [showSettings, setShowSettings] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [langFilter, setLangFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<{
    id: string;
    action: "delete" | "favorite";
  } | null>(null);

  const configuredLanguages = useMemo(() => {
    return Array.isArray(settings.languages) && settings.languages.length > 0
      ? settings.languages
      : LANGUAGES;
  }, [settings.languages]);

  const fetchSnippets = useCallback(async () => {
    try {
      const response = await fetch("/api/content?module_type=snippet");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to fetch snippets");
      setSnippets(data.data || []);
    } catch (err: unknown) {
      console.error("fetchSnippets failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const handleFormClose = useCallback(() => {
    setEditingSnippet(null);
    setShowForm(false);
  }, []);

  const handleFormSave = useCallback(() => {
    setEditingSnippet(null);
    setShowForm(false);
    fetchSnippets();
  }, [fetchSnippets]);

  const handleEdit = useCallback((snippet: Snippet) => {
    setEditingSnippet(snippet);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this snippet?")) return;
      setProcessingAction({ id, action: "delete" });
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
        await fetchSnippets();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete";
        alert(message);
      } finally {
        setProcessingAction(null);
      }
    },
    [fetchSnippets],
  );

  const handleCopy = useCallback(async (id: string, snippetCode: string) => {
    await navigator.clipboard.writeText(snippetCode);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }, []);

  const toggleFavorite = useCallback(
    async (snippet: Snippet) => {
      setProcessingAction({ id: snippet._id, action: "favorite" });
      try {
        const payload = {
          ...snippet.payload,
          is_favorite: !snippet.payload.is_favorite,
        };
        const res = await fetch(`/api/content/${snippet._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update favorite");
        await fetchSnippets();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update";
        alert(message);
      } finally {
        setProcessingAction(null);
      }
    },
    [fetchSnippets],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...snippets]
      .filter((snippet) => {
        if (langFilter !== "all" && snippet.payload.language !== langFilter)
          return false;
        if (favoritesOnly && !snippet.payload.is_favorite) return false;
        if (!query) return true;

        const haystack =
          `${snippet.payload.title} ${snippet.payload.code} ${snippet.payload.description || ""} ${snippet.payload.tags.join(" ")}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (a.payload.is_favorite !== b.payload.is_favorite) {
          return a.payload.is_favorite ? -1 : 1;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [snippets, langFilter, favoritesOnly, searchQuery]);

  const stats: SnippetStats = useMemo(() => {
    const total = snippets.length;
    const favorites = snippets.filter((s) => s.payload.is_favorite).length;
    const languages = new Set(snippets.map((s) => s.payload.language)).size;
    const averageLength =
      total > 0
        ? Math.round(
            snippets.reduce(
              (sum, s) => sum + s.payload.code.split("\n").length,
              0,
            ) / total,
          )
        : 0;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = snippets.filter(
      (s) => new Date(s.created_at) >= weekAgo,
    ).length;
    const allTags = new Set(snippets.flatMap((s) => s.payload.tags));
    const tagCount = allTags.size;

    return {
      total,
      favorites,
      languages,
      averageLength,
      recentCount,
      tagCount,
    };
  }, [snippets]);

  const languageChips = useMemo(() => {
    return [...new Set(snippets.map((s) => s.payload.language))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [snippets]);

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                Snippet Box
              </h1>
              <p className="text-zinc-400 mt-1">
                Store and search reusable code, commands, and technical notes.
              </p>
            </div>
            <div className="flex items-center gap-2 md:pt-1">
              <button
                onClick={() => setShowSettings((prev) => !prev)}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-sm transition-colors",
                  showSettings
                    ? "bg-accent/15 text-accent"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-300",
                )}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditingSnippet(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> New Snippet
              </button>
            </div>
          </div>

          <SnippetsMetrics snippets={snippets} stats={stats} />
        </div>
      </div>

      {/* Settings */}
      <SnippetsSettings
        visible={showSettings}
        settings={settings}
        saving={settingsSaving}
        configuredLanguages={configuredLanguages}
        onUpdate={updateSettings}
      />

      {/* Form */}
      <SnippetForm
        key={editingSnippet?._id ?? "new"}
        visible={showForm}
        editingSnippet={editingSnippet}
        settings={settings}
        configuredLanguages={configuredLanguages}
        onSave={handleFormSave}
        onClose={handleFormClose}
      />

      {/* Filters */}
      <SnippetsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        langFilter={langFilter}
        onLangFilterChange={setLangFilter}
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={() => setFavoritesOnly((prev) => !prev)}
        languageChips={languageChips}
        filteredCount={filtered.length}
        totalCount={snippets.length}
      />

      {/* Snippet List */}
      {loading ? (
        <AdminModuleSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <Code className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No snippets found for current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((snippet, index) => (
              <SnippetCard
                key={snippet._id}
                snippet={snippet}
                index={index}
                copiedId={copiedId}
                processingAction={processingAction}
                showLineNumbers={settings.showLineNumbers}
                onCopy={handleCopy}
                onToggleFavorite={toggleFavorite}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
