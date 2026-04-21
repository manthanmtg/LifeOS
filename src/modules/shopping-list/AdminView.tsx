"use client";

import React, { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Toast from "@/components/ui/Toast";
import ShoppingListHeader from "./components/ShoppingListHeader";
import ShoppingListGridView from "./components/ShoppingListGridView";
import ShoppingListDetailView from "./components/ShoppingListDetailView";
import { useShoppingLists } from "./hooks/useShoppingLists";
import { buildSuggestionNames, filterLists } from "./helpers";
import { ShoppingListDocument, ShoppingListTab } from "./types";

export default function ShoppingListAdminView() {
  const {
    lists,
    loading,
    isSaving,
    toast,
    hideToast,
    handleCreateList,
    handleDeleteList,
    handleDuplicateList,
    handleToggleListComplete,
    handleAddItem,
    handleToggleItem,
    handleDeleteItem,
    handleClearPurchased,
  } = useShoppingLists();

  const [activeTab, setActiveTab] = useState<ShoppingListTab>("active");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredLists = useMemo(
    () => filterLists(lists, activeTab, searchQuery),
    [lists, activeTab, searchQuery],
  );

  const selectedList = useMemo(
    () => lists.find((list) => list._id === selectedListId) ?? null,
    [lists, selectedListId],
  );

  const suggestionNames = useMemo(
    () => buildSuggestionNames(lists, selectedListId),
    [lists, selectedListId],
  );

  const handleCreateAndOpen = async (title: string) => {
    const newList = await handleCreateList(title);
    if (newList) {
      setSelectedListId(newList._id);
      setActiveTab("active");
    }
  };

  const handleDuplicateAndOpen = async (list: ShoppingListDocument) => {
    const newList = await handleDuplicateList(list);
    if (newList) {
      setSelectedListId(newList._id);
      setActiveTab("active");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ShoppingListHeader
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedListId(null);
        }}
      />

      {!selectedList ? (
        <ShoppingListGridView
          lists={filteredLists}
          loading={loading}
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateList={handleCreateAndOpen}
          onSelectList={setSelectedListId}
          onDuplicateList={handleDuplicateAndOpen}
          onDeleteList={setConfirmDeleteId}
          isSaving={isSaving}
        />
      ) : (
        <ShoppingListDetailView
          list={selectedList}
          onBack={() => setSelectedListId(null)}
          onToggleComplete={handleToggleListComplete}
          onDuplicate={handleDuplicateAndOpen}
          onDelete={setConfirmDeleteId}
          onAddItem={handleAddItem}
          onToggleItem={handleToggleItem}
          onDeleteItem={handleDeleteItem}
          onClearPurchased={handleClearPurchased}
          suggestions={suggestionNames}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Delete list"
        description="Are you sure you want to delete this shopping list? All items will be removed."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId) {
            void handleDeleteList(confirmDeleteId);
            if (selectedListId === confirmDeleteId) {
              setSelectedListId(null);
            }
          }
        }}
        onClose={() => setConfirmDeleteId(null)}
      />

      <Toast {...toast} onClose={hideToast} />
    </div>
  );
}
