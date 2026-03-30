"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Tv } from "lucide-react";
import type { BingeItem } from "./types";
import { SkeletonBlock } from "@/components/ui/Skeletons";
import BingeMetrics from "./components/BingeMetrics";
import BingeFilters from "./components/BingeFilters";
import BingeCard from "./components/BingeCard";
import BingeForm from "./components/BingeForm";

export default function BingeAdminView() {
  const [items, setItems] = useState<BingeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BingeItem | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/content?module_type=binge_item");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
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

  const handleEdit = useCallback((item: BingeItem) => {
    setEditingItem(item);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this item?")) return;
      setIsDeletingId(id);
      try {
        const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
        await fetchItems();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setIsDeletingId(null);
      }
    },
    [fetchItems],
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleOpenNewForm = useCallback(() => {
    setEditingItem(null);
    setShowForm(true);
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [items]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedItems.filter((item) => {
      if (statusFilter !== "all" && item.payload.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && item.payload.type !== typeFilter)
        return false;
      if (!query) return true;
      const haystack =
        `${item.payload.title} ${item.payload.genre || ""} ${item.payload.platform || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedItems, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
                Binge
              </h1>
              <p className="text-zinc-400 mt-1">
                Track movies, series, documentaries, and anime — all in one
                place.
              </p>
            </div>
            <div className="flex items-center gap-2 md:pt-1">
              <button
                onClick={handleOpenNewForm}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-zinc-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>

          {/* Metrics */}
          <BingeMetrics items={items} />
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <BingeForm
            editingItem={editingItem}
            onSave={fetchItems}
            onClose={handleFormClose}
          />
        )}
      </AnimatePresence>

      {/* Filters */}
      <BingeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        totalVisible={filtered.length}
        totalItems={items.length}
      />

      {/* Item Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse space-y-3"
            >
              <div className="flex items-start gap-3">
                <SkeletonBlock className="w-14 h-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-3 w-1/2" />
                  <div className="flex gap-1.5 pt-1">
                    <SkeletonBlock className="h-4 w-14 rounded-full" />
                    <SkeletonBlock className="h-4 w-16 rounded-full" />
                  </div>
                </div>
              </div>
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <Tv className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No items found for current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((item, i) => (
              <BingeCard
                key={item._id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDeletingId={isDeletingId}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
