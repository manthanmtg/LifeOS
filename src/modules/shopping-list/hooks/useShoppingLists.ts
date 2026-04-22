import { useCallback, useEffect, useState } from "react";
import {
  ShoppingItem,
  ShoppingListDocument,
  ShoppingListPayload,
} from "../types";
import { createItemId, parseSmartEntry } from "../helpers";

export type ToastType = "success" | "error" | "info";

export function useShoppingLists() {
  const [lists, setLists] = useState<ShoppingListDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const hideToast = useCallback(() => {
    setToast((current) => ({ ...current, isVisible: false }));
  }, []);

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

  const handleCreateList = async (title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setIsSaving(true);

    try {
      const payload: ShoppingListPayload = {
        title: trimmedTitle,
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
      showToast("Shopping list created");
      return data.data as ShoppingListDocument;
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

    setLists((current) => current.filter((list) => list._id !== listId));

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
      items: list.payload.items.map((item: ShoppingItem) => ({
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
      showToast("List duplicated");
      return data.data as ShoppingListDocument;
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
  };

  const handleToggleItem = async (listId: string, itemId: string) => {
    const list = lists.find((entry) => entry._id === listId);
    if (!list) {
      return;
    }

    await updateListPayload(listId, {
      ...list.payload,
      items: list.payload.items.map((item: ShoppingItem) =>
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
      items: list.payload.items.filter(
        (item: ShoppingItem) => item.id !== itemId,
      ),
    });
  };

  const handleClearPurchased = async (listId: string) => {
    const list = lists.find((entry) => entry._id === listId);
    if (!list) {
      return;
    }

    await updateListPayload(listId, {
      ...list.payload,
      items: list.payload.items.filter((item: ShoppingItem) => !item.purchased),
    });

    showToast("Purchased items cleared", "info");
  };

  return {
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
  };
}
