import React from "react";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import ListCard from "./ListCard";
import ShoppingListSkeleton from "./ShoppingListSkeleton";
import { ShoppingListDocument, ShoppingListTab } from "../types";

interface ShoppingListGridViewProps {
  lists: ShoppingListDocument[];
  loading: boolean;
  activeTab: ShoppingListTab;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateList: (title: string) => void;
  onSelectList: (id: string) => void;
  onDuplicateList: (list: ShoppingListDocument) => void;
  onDeleteList: (id: string) => void;
  isSaving: boolean;
}

export default function ShoppingListGridView({
  lists,
  loading,
  activeTab,
  searchQuery,
  onSearchChange,
  onCreateList,
  onSelectList,
  onDuplicateList,
  onDeleteList,
  isSaving,
}: ShoppingListGridViewProps) {
  const [newListTitle, setNewListTitle] = useState("");

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onCreateList(newListTitle);
      setNewListTitle("");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <form onSubmit={handleCreateSubmit} className="group relative lg:col-span-2">
          <Plus
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors",
              isSaving
                ? "animate-spin text-accent"
                : "group-focus-within:text-accent",
            )}
          />
          <input
            type="text"
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="Create a new shopping list..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-11 pr-4 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
            disabled={isSaving}
          />
        </form>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search lists..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-11 pr-4 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-700"
          />
        </div>
      </div>

      {loading ? (
        <ShoppingListSkeleton />
      ) : lists.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {lists.map((list) => (
              <ListCard
                key={list._id}
                list={list}
                onOpen={onSelectList}
                onDuplicate={onDuplicateList}
                onDelete={onDeleteList}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900">
            <ShoppingBag className="h-8 w-8 text-zinc-700" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-200">
            {activeTab === "active"
              ? "No active lists yet"
              : "No completed lists"}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {activeTab === "active"
              ? "Create a list to start tracking what you need."
              : "Completed lists will appear here once you finish them."}
          </p>
        </div>
      )}
    </>
  );
}
