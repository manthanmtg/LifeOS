"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  Copy,
  Info,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import Toast, { ToastType } from "./Toast";
import ItemSection from "./components/ItemSection";
import ListCard from "./components/ListCard";
import ShoppingListSkeleton from "./components/ShoppingListSkeleton";
import {
  buildSuggestionNames,
  filterLists,
  parseSmartEntry,
  partitionItems,
} from "./helpers";
import {
  ShoppingItem,
  ShoppingListDocument,
  ShoppingListPayload,
  ShoppingListTab,
} from "./types";

function createItemId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ShoppingListAdminView() {
  const [lists, setLists] = useState<ShoppingListDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ShoppingListTab>("active");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [quickAddItem, setQuickAddItem] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPurchasedCollapsed, setIsPurchasedCollapsed] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ message, type, isVisible: true });
    },
    [],
  );

  const fetchLists = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/content?module_type=shopping_list");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lists");
      }

      setLists(data.data || []);
    } catch {
      showToast("Failed to fetch shopping lists", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const filteredLists = useMemo(
    () => filterLists(lists, activeTab, searchQuery),
    [lists, activeTab, searchQuery],
  );

  const selectedList = useMemo(
    () => lists.find((list) => list._id === selectedListId) ?? null,
    [lists, selectedListId],
  );

  const parsedQuickAdd = useMemo(
    () => parseSmartEntry(quickAddItem),
    [quickAddItem],
  );

  const suggestionNames = useMemo(
    () => buildSuggestionNames(lists, selectedListId),
    [lists, selectedListId],
  );

  const { remainingItems, purchasedItems } = useMemo(
    () => partitionItems(selectedList?.payload.items ?? []),
    [selectedList],
  );

  const updateListPayload = useCallback(
    async (listId: string, updatedPayload: ShoppingListPayload) => {
      const previousLists = lists;

      setLists((current) =>
        current.map((list) =>
          list._id === listId ? { ...list, payload: updatedPayload } : list,
        ),
      );

      try {
        const response = await fetch(`/api/content/${listId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: updatedPayload }),
        });

        if (!response.ok) {
          throw new Error("Failed to update list");
        }
      } catch {
        setLists(previousLists);
        showToast("Failed to save changes", "error");
      }
    },
    [lists, showToast],
  );

  const handleCreateList = async (event: React.FormEvent) => {
    event.preventDefault();

    const title = newListTitle.trim();
    if (!title) {
      return;
    }

    setIsSaving(true);

    try {
      const payload: ShoppingListPayload = {
        title,
        items: [],
        is_completed: false,
      };

      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "shopping_list",
          is_public: false,
          payload,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create list");
      }

      setLists((current) => [data.data, ...current]);
      setNewListTitle("");
      setSelectedListId(data.data._id);
      setActiveTab("active");
      showToast("Shopping list created");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to create list",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    const previousLists = lists;

    setConfirmDeleteId(null);
    setLists((current) => current.filter((list) => list._id !== listId));

    if (selectedListId === listId) {
      setSelectedListId(null);
    }

    try {
      const response = await fetch(`/api/content/${listId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete list");
      }

      showToast("List deleted");
    } catch {
      setLists(previousLists);
      showToast("Failed to delete list", "error");
    }
  };

  const handleDuplicateList = async (list: ShoppingListDocument) => {
    const payload: ShoppingListPayload = {
      ...list.payload,
      title: `${list.payload.title} (Copy)`,
      is_completed: false,
      completed_at: undefined,
      items: list.payload.items.map((item) => ({
        ...item,
        purchased: false,
      })),
    };

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_type: "shopping_list",
          is_public: false,
          payload,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to duplicate list");
      }

      setLists((current) => [data.data, ...current]);
      setSelectedListId(data.data._id);
      setActiveTab("active");
      showToast("List duplicated");
    } catch {
      showToast("Failed to duplicate list", "error");
    }
  };

  const handleToggleListComplete = async (list: ShoppingListDocument) => {
    const isCompleted = !list.payload.is_completed;

    await updateListPayload(list._id, {
      ...list.payload,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : undefined,
    });

    showToast(isCompleted ? "List marked as completed" : "List restored");
  };

  const handleAddItem = async (listId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const list = lists.find((entry) => entry._id === listId);
    if (!list) {
      return;
    }

    const parsed = parseSmartEntry(trimmedName);
    const newItem: ShoppingItem = {
      id: createItemId(),
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      purchased: false,
    };

    await updateListPayload(listId, {
      ...list.payload,
      items: [...list.payload.items, newItem],
    });

    setQuickAddItem("");
  };

  const handleAddItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedListId) {
      return;
    }

    await handleAddItem(selectedListId, quickAddItem);
  };

  const handleToggleItem = async (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry._id === listId);
    if (!list) {
      return;
    }

    await updateListPayload(listId, {
      ...list.payload,
      items: list.payload.items.map((item) =>
        item.id === itemId ? { ...item, purchased: !item.purchased } : item,
      ),
    });
  };

  const handleDeleteItem = async (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry._id === listId);
    if (!list) {
      return;
    }

    await updateListPayload(listId, {
      ...list.payload,
      items: list.payload.items.filter((item) => item.id !== itemId),
    });
  };

  const handleClearPurchased = async (listId: string) => {
    const list = lists.find((entry) => entry._id === listId);
    if (!list) {
      return;
    }

    await updateListPayload(listId, {
      ...list.payload,
      items: list.payload.items.filter((item) => !item.purchased),
    });

    showToast("Purchased items cleared", "info");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Shopping List</span>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
                Shopping List
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Build reusable lists, add items fast, and check them off
                in-store.
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
            {(["active", "completed"] as ShoppingListTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedListId(null);
                }}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors",
                  activeTab === tab
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedList ? (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <form
              onSubmit={handleCreateList}
              className="group relative lg:col-span-2"
            >
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
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search lists..."
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 pl-11 pr-4 text-sm text-zinc-50 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-700"
              />
            </div>
          </div>

          {loading ? (
            <ShoppingListSkeleton />
          ) : filteredLists.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredLists.map((list) => (
                  <ListCard
                    key={list._id}
                    list={list}
                    onOpen={setSelectedListId}
                    onDuplicate={handleDuplicateList}
                    onDelete={setConfirmDeleteId}
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
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedListId(null)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition-colors hover:text-zinc-200"
                aria-label="Back to shopping lists"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div>
                <h2 className="text-xl font-semibold text-zinc-50">
                  {selectedList.payload.title}
                </h2>
                <p className="text-sm text-zinc-500">
                  {remainingItems.length} left, {purchasedItems.length}{" "}
                  purchased
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleListComplete(selectedList)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  selectedList.payload.is_completed
                    ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "border-success/20 bg-success/10 text-success hover:bg-success/20",
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {selectedList.payload.is_completed ? "Restore" : "Done"}
              </button>

              <button
                type="button"
                onClick={() => handleDuplicateList(selectedList)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-400 transition-colors hover:text-accent"
                aria-label="Duplicate list"
              >
                <Copy className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedList._id)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-400 transition-colors hover:text-danger"
                aria-label="Delete list"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!selectedList.payload.is_completed ? (
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
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-3 text-xs">
                  <div className="rounded-xl border border-accent/20 bg-zinc-950 p-2 text-accent">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-300">Smart preview</p>
                    <p className="text-zinc-500">
                      {parsedQuickAdd.name}
                      {parsedQuickAdd.quantity ? (
                        <span className="mx-1 text-accent">
                          {parsedQuickAdd.quantity}
                        </span>
                      ) : null}
                      {parsedQuickAdd.unit ? (
                        <span className="text-zinc-400">
                          {parsedQuickAdd.unit}
                        </span>
                      ) : null}
                    </p>
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
              listId={selectedList._id}
              purchased={false}
              suggestions={
                !selectedList.payload.is_completed ? suggestionNames : []
              }
              onSuggestionSelect={(suggestion) =>
                void handleAddItem(selectedList._id, suggestion)
              }
              onToggleItem={(listId, itemId) =>
                void handleToggleItem(listId, itemId)
              }
              onDeleteItem={(listId, itemId) =>
                void handleDeleteItem(listId, itemId)
              }
            />

            <ItemSection
              title="Purchased"
              count={purchasedItems.length}
              items={purchasedItems}
              emptyMessage="No items purchased yet."
              listId={selectedList._id}
              purchased
              isCollapsed={isPurchasedCollapsed}
              onToggleCollapse={() =>
                setIsPurchasedCollapsed((current) => !current)
              }
              actionLabel={purchasedItems.length > 0 ? "Clear" : undefined}
              onAction={
                purchasedItems.length > 0
                  ? () => void handleClearPurchased(selectedList._id)
                  : undefined
              }
              onToggleItem={(listId, itemId) =>
                void handleToggleItem(listId, itemId)
              }
              onDeleteItem={(listId, itemId) =>
                void handleDeleteItem(listId, itemId)
              }
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Delete list"
        description="Are you sure you want to delete this shopping list? All items will be removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId) {
            void handleDeleteList(confirmDeleteId);
          }
        }}
        onClose={() => setConfirmDeleteId(null)}
      />

      <Toast
        {...toast}
        onClose={() =>
          setToast((current) => ({ ...current, isVisible: false }))
        }
      />
    </div>
  );
}
