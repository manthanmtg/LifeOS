import React from "react";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  Copy,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ItemSection from "./ItemSection";
import { parseSmartEntry, partitionItems } from "../helpers";
import { ShoppingListDocument } from "../types";

interface ShoppingListDetailViewProps {
  list: ShoppingListDocument;
  onBack: () => void;
  onToggleComplete: (list: ShoppingListDocument) => void;
  onDuplicate: (list: ShoppingListDocument) => void;
  onDelete: (id: string) => void;
  onAddItem: (listId: string, name: string) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
  onClearPurchased: (listId: string) => void;
  suggestions: string[];
}

export default function ShoppingListDetailView({
  list,
  onBack,
  onToggleComplete,
  onDuplicate,
  onDelete,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearPurchased,
  suggestions,
}: ShoppingListDetailViewProps) {
  const [quickAddItem, setQuickAddItem] = useState("");
  const [isPurchasedCollapsed, setIsPurchasedCollapsed] = useState(false);

  const parsedQuickAdd = useMemo(
    () => parseSmartEntry(quickAddItem),
    [quickAddItem],
  );

  const { remainingItems, purchasedItems } = useMemo(
    () => partitionItems(list.payload.items),
    [list.payload.items],
  );

  const handleAddItemSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (quickAddItem.trim()) {
      onAddItem(list._id, quickAddItem);
      setQuickAddItem("");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition-colors hover:text-zinc-200"
            aria-label="Back to shopping lists"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div>
            <h2 className="text-xl font-semibold text-zinc-50">
              {list.payload.title}
            </h2>
            <p className="text-sm text-zinc-500">
              {remainingItems.length} left, {purchasedItems.length} purchased
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleComplete(list)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              list.payload.is_completed
                ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "border-success/20 bg-success/10 text-success hover:bg-success/20",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {list.payload.is_completed ? "Restore" : "Done"}
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(list)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-400 transition-colors hover:text-accent"
            aria-label="Duplicate list"
          >
            <Copy className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(list._id)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-400 transition-colors hover:text-danger"
            aria-label="Delete list"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!list.payload.is_completed ? (
        <form onSubmit={handleAddItemSubmit} className="group relative">
          <Plus className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-accent" />
          <input
            type="text"
            value={quickAddItem}
            onChange={(event) => setQuickAddItem(event.target.value)}
            placeholder="Add item... try: Milk 2 ltr"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-11 pr-4 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
          />

          {quickAddItem.trim() ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-3 text-xs animate-in zoom-in-95 duration-200">
              <div className="rounded-xl border border-accent/20 bg-zinc-950 p-2 text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-zinc-400">Smart Preview</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">
                    {parsedQuickAdd.name}
                  </span>
                  {(parsedQuickAdd.quantity || parsedQuickAdd.unit) && (
                    <span className="flex items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
                      {parsedQuickAdd.quantity} {parsedQuickAdd.unit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </form>
      ) : null}

      <div className="space-y-5">
        <ItemSection
          title="Items to buy"
          count={remainingItems.length}
          items={remainingItems}
          emptyMessage="Nothing left to buy."
          listId={list._id}
          purchased={false}
          suggestions={!list.payload.is_completed ? suggestions : []}
          onSuggestionSelect={(suggestion) => onAddItem(list._id, suggestion)}
          onToggleItem={onToggleItem}
          onDeleteItem={onDeleteItem}
        />

        <ItemSection
          title="Purchased"
          count={purchasedItems.length}
          items={purchasedItems}
          emptyMessage="No items purchased yet."
          listId={list._id}
          purchased
          isCollapsed={isPurchasedCollapsed}
          onToggleCollapse={() =>
            setIsPurchasedCollapsed((current) => !current)
          }
          actionLabel={purchasedItems.length > 0 ? "Clear" : undefined}
          onAction={
            purchasedItems.length > 0
              ? () => onClearPurchased(list._id)
              : undefined
          }
          onToggleItem={onToggleItem}
          onDeleteItem={onDeleteItem}
        />
      </div>
    </div>
  );
}
