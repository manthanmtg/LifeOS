"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Settings, Code, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import type { Snippet } from "./components/types";
import {
  SNIPPET_DEFAULTS,
  LANGUAGES,
  getSnippetStats,
} from "./components/types";
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
  const [statsReferenceTime] = useState(() => Date.now());
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
      if (!confirm("Are you sure you want to delete this snippet?")) return;
      setProcessingAction({ id, action: "delete" });
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Delete failed");
        }
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
    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
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
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update favorite");
        }
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

    return snippets
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
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      });
  }, [snippets, langFilter, favoritesOnly, searchQuery]);

  const stats = useMemo(
    () => getSnippetStats(snippets, statsReferenceTime),
    [snippets, statsReferenceTime],
  );

  const languageChips = useMemo(() => {
    return [...new Set(snippets.map((s) => s.payload.language))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [snippets]);

  return (
    <div className="animate-fade-in-up space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-zinc-950/20">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/5 blur-[100px]" />

        <div className="relative space-y-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="bg-accent/20 p-2 rounded-xl">
                  <Code className="w-6 h-6 text-accent" />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-zinc-50">
                  Snippet <span className="text-accent">Box</span>
                </h1>
              </div>
              <p className="text-zinc-400 text-sm font-medium ml-1">
                Your personal library of reusable code and technical wisdom.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings((prev) => !prev)}
                className={cn(
                  "p-3 rounded-2xl transition-all duration-300 border",
                  showSettings
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600",
                )}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditingSnippet(null);
                  setShowForm(true);
                }}
                className="group flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-bold px-6 py-3 rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                New Snippet
              </button>
            </div>
          </div>

          <SnippetsMetrics
            snippets={snippets}
            stats={stats}
            referenceTime={statsReferenceTime}
          />
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-10 relative"
          >
            <SnippetsSettings
              visible={true}
              settings={settings}
              saving={settingsSaving}
              configuredLanguages={configuredLanguages}
              onUpdate={updateSettings}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Overlay-like spacing */}
      <SnippetForm
        key={editingSnippet?._id ?? "new"}
        visible={showForm}
        editingSnippet={editingSnippet}
        settings={settings}
        configuredLanguages={configuredLanguages}
        onSave={handleFormSave}
        onClose={handleFormClose}
      />

      {/* Main Content Area */}
      <div className="space-y-6">
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

        {loading ? (
          <AdminModuleSkeleton />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 px-4 border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-300 mb-2">
              No snippets found
            </h3>
            <p className="text-zinc-500 max-w-xs mx-auto mb-8">
              We couldn&apos;t find any snippets matching your current filters
              or search query.
            </p>
            {(searchQuery || langFilter !== "all" || favoritesOnly) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setLangFilter("all");
                  setFavoritesOnly(false);
                }}
                className="text-accent hover:text-accent-hover font-semibold flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Clear all filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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
    </div>
  );
}
