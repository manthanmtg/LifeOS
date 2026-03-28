"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Tv, RefreshCw } from "lucide-react";
import type { BingeItem } from "./types";
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
        <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-purple-500/10 blur-3xl" />
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
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
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
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
            <span>Loading your watchlist...</span>
          </div>
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
