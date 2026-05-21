"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { ReadingItem } from "./types";
import { ReadingMetrics } from "./components/ReadingMetrics";
import { ReadingFilters } from "./components/ReadingFilters";
import { ReadingPublicItemCard } from "./components/ReadingPublicItemCard";
import { PRIORITY_ORDER, parseIsoDate } from "./utils";
import { AnimatePresence, motion } from "framer-motion";

export default function ReadingPublicView({
  items,
}: {
  items: Record<string, unknown>[];
}) {
  const readings = items as unknown as ReadingItem[];
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("unread");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const availableTypes = useMemo(() => {
    return [...new Set(readings.map((item) => item.payload.type))].sort(
      (a, b) => a.localeCompare(b),
    );
  }, [readings]);

  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    readings.forEach((item) => {
      item.payload.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [readings]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...readings]
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
        const aCreated = parseIsoDate(a.created_at);
        const bCreated = parseIsoDate(b.created_at);
        if (aCreated === null && bCreated === null) return 0;
        if (aCreated === null) return 1;
        if (bCreated === null) return -1;
        return bCreated - aCreated;
      });
  }, [readings, searchQuery, statusFilter, typeFilter, tagFilter]);

  if (readings.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-20 animate-fade-in">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No reading items shared yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/20">
        <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-accent/20 blur-[80px] animate-pulse" />
        <div className="absolute -bottom-20 left-1/4 h-60 w-60 rounded-full bg-warning/10 blur-[80px]" />

        <div className="relative space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-50 leading-tight max-w-2xl">
            My reading queue and <span className="text-accent underline decoration-accent/30 decoration-4 underline-offset-4">curated references.</span>
          </h2>

          <ReadingMetrics items={readings} />
        </div>
      </div>


      <ReadingFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        allTypes={availableTypes}
        allUniqueTags={allUniqueTags}
      />

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40"
        >
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No reading items found for current filters.</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <ReadingPublicItemCard key={item._id} item={item} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
