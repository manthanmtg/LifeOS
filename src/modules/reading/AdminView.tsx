"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, BookOpen, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModuleSettings } from "@/hooks/useModuleSettings";
import {
  ReadingItem,
  READING_DEFAULTS,
  ReadingPayload,
  ReadingSettings,
} from "./types";
import { ReadingMetrics } from "./components/ReadingMetrics";
import { ReadingSettingsView } from "./components/ReadingSettingsView";
import { ReadingForm } from "./components/ReadingForm";
import { ReadingItemCard } from "./components/ReadingItemCard";
import { ReadingFilters } from "./components/ReadingFilters";
import { PRIORITY_ORDER } from "./utils";
import { AnimatePresence, motion } from "framer-motion";
import { AdminModuleSkeleton, ContentListSkeleton } from "@/components/ui/Skeletons";

export default function ReadingAdminView() {
  const {
    settings,
    updateSettings,
    saving: settingsSaving,
  } = useModuleSettings<ReadingSettings>("readingSettings", READING_DEFAULTS);

  const [showSettings, setShowSettings] = useState(false);
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("unread");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [editingItem, setEditingItem] = useState<ReadingItem | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const allTypes = useMemo(() => {
    const configured = Array.isArray(settings.types) ? settings.types : [];
    return configured.length > 0 ? configured : READING_DEFAULTS.types;
  }, [settings.types]);

  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((item) => {
      item.payload.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [items]);

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch("/api/content?module_type=reading_item");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch items");
      setItems(data.data || []);
    } catch (err: unknown) {
      console.error("fetchItems failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFormSubmit = async (payload: ReadingPayload, id?: string) => {
    setIsSubmitting(true);
    setFormError("");
    try {
      const method = id ? "PUT" : "POST";
      const endpoint = id ? `/api/content/${id}` : "/api/content";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "reading_item",
          is_public: false,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || `Failed to ${id ? "update" : "save"} item`,
        );

      setEditingItem(null);
      setShowForm(false);
      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRead = async (item: ReadingItem) => {
    setIsTogglingId(item._id);
    try {
      const payload = {
        ...item.payload,
        is_read: !item.payload.is_read,
        read_at: !item.payload.is_read ? new Date().toISOString() : undefined,
      };

      const res = await fetch(`/api/content/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update item");
      await fetchItems();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to toggle status";
      alert(message);
    } finally {
      setIsTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      alert(message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...items]
      .filter((item) => {
        if (statusFilter === "unread" && item.payload.is_read) return false;
        if (statusFilter === "read" && !item.payload.is_read) return false;
        if (typeFilter !== "all" && item.payload.type !== typeFilter)
          return false;
        if (tagFilter !== "all" && !item.payload.tags?.includes(tagFilter))
          return false;
        if (!query) return true;

        const tagsString = (item.payload.tags || []).join(" ");
        const haystack =
          `${item.payload.title} ${item.payload.source_domain || ""} ${item.payload.type} ${item.payload.notes || ""} ${tagsString}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const prioritySort =
          (PRIORITY_ORDER[a.payload.priority] ?? 1) -
          (PRIORITY_ORDER[b.payload.priority] ?? 1);
        if (prioritySort !== 0) return prioritySort;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [items, statusFilter, typeFilter, searchQuery, tagFilter]);

  if (loading && items.length === 0) {
    return <AdminModuleSkeleton />;
  }

  const readNext = () => {
    const unreadHigh = items.filter(
      (i) => !i.payload.is_read && i.payload.priority === "high",
    );
    const source =
      unreadHigh.length > 0
        ? unreadHigh
        : items.filter((i) => !i.payload.is_read);

    if (source.length === 0) {
      alert("No unread items in your queue!");
      return;
    }

    const random = source[Math.floor(Math.random() * source.length)];
    window.open(random.payload.url, "_blank");
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                Reading Queue
              </h1>
              <p className="text-zinc-400 mt-1">
                Capture links, prioritize what matters, and maintain a clean
                learning backlog.
              </p>
            </div>
            <div className="flex items-center gap-2 md:pt-1">
              <button
                onClick={() => setShowSettings((prev) => !prev)}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-sm transition-all",
                  showSettings
                    ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700",
                )}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={readNext}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-zinc-700"
                title="Open a random unread item"
              >
                <Sparkles className="w-4 h-4 text-accent" /> Read Next
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-accent/20"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>

          <ReadingMetrics items={items} loading={loading} />
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ReadingSettingsView
              settings={settings}
              updateSettings={updateSettings}
              saving={settingsSaving}
              allTypes={allTypes}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ReadingForm
              key={editingItem?._id || "new"}
              initialData={editingItem}
              allTypes={allTypes}
              defaultPriority={settings.defaultPriority}
              defaultType={settings.defaultType}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              isSubmitting={isSubmitting}
              formError={formError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ReadingFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        allTypes={allTypes}
        allUniqueTags={allUniqueTags}
      />

      <div className="relative">
        {loading && items.length > 0 && (
          <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent animate-spin" />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest text-zinc-200">Refining Queue</span>
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <ContentListSkeleton length={4} />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40"
          >
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Queue is empty for current filters.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <ReadingItemCard
                  key={item._id}
                  item={item}
                  onToggleRead={toggleRead}
                  onEdit={(item) => {
                    setEditingItem(item);
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onDelete={handleDelete}
                  isToggling={isTogglingId === item._id}
                  isDeleting={isDeletingId === item._id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
