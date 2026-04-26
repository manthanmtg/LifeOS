import {
  ParsedShoppingEntry,
  ShoppingItem,
  ShoppingListDocument,
  ShoppingListPayload,
  ShoppingListSummary,
  ShoppingListTab,
} from "./types";

const QUANTITY_FIRST_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/;
const NAME_FIRST_PATTERN = /^(.*?)[,\s]+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/;

export function createItemId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseSmartEntry(text: string): ParsedShoppingEntry {
  const trimmed = text.trim();

  // Try quantity first: "10 eggs" or "2kg Milk"
  const qFirstMatch = trimmed.match(QUANTITY_FIRST_PATTERN);
  if (qFirstMatch) {
    return {
      name: qFirstMatch[3].trim(),
      quantity: qFirstMatch[1],
      unit: qFirstMatch[2] || undefined,
    };
  }

  // Try name first: "Milk 2 ltr" or "Apples, 1.5kg"
  const nFirstMatch = trimmed.match(NAME_FIRST_PATTERN);
  if (nFirstMatch) {
    return {
      name: nFirstMatch[1].trim(),
      quantity: nFirstMatch[2],
      unit: nFirstMatch[3] || undefined,
    };
  }

  return { name: trimmed };
}

export function summarizeList(
  payload: ShoppingListPayload | undefined,
): ShoppingListSummary {
  const items = payload?.items ?? [];
  const totalItems = items.length;
  const purchasedItems = items.filter((item) => item.purchased).length;
  const remainingItems = totalItems - purchasedItems;

  return {
    totalItems,
    purchasedItems,
    remainingItems,
    completionPercent:
      totalItems === 0 ? 0 : Math.round((purchasedItems / totalItems) * 100),
  };
}

export function filterLists(
  lists: ShoppingListDocument[],
  activeTab: ShoppingListTab,
  searchQuery: string,
): ShoppingListDocument[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return [...lists]
    .filter(
      (list) =>
        list.payload.is_completed === (activeTab === "completed") &&
        (normalizedQuery.length === 0 ||
          list.payload.title.toLowerCase().includes(normalizedQuery)),
    )
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );
}

export function partitionItems(items: ShoppingItem[]) {
  const remainingItems: ShoppingItem[] = [];
  const purchasedItems: ShoppingItem[] = [];

  items.forEach((item) => {
    if (item.purchased) {
      purchasedItems.push(item);
    } else {
      remainingItems.push(item);
    }
  });

  return { remainingItems, purchasedItems };
}

export function buildSuggestionNames(
  lists: ShoppingListDocument[],
  selectedListId: string | null,
): string[] {
  if (!selectedListId) {
    return [];
  }

  const selectedList = lists.find((list) => list._id === selectedListId);
  if (!selectedList) {
    return [];
  }

  const currentNames = new Set(
    selectedList.payload.items.map((item) => item.name.trim().toLowerCase()),
  );

  const frequencies = new Map<string, { label: string; count: number }>();

  lists.forEach((list) => {
    if (list._id === selectedListId) {
      return;
    }

    const seenInList = new Set<string>();

    list.payload.items.forEach((item) => {
      const normalized = item.name.trim().toLowerCase();
      if (
        !normalized ||
        currentNames.has(normalized) ||
        seenInList.has(normalized)
      ) {
        return;
      }

      seenInList.add(normalized);
      const existing = frequencies.get(normalized);

      frequencies.set(normalized, {
        label: existing?.label ?? item.name.trim(),
        count: (existing?.count ?? 0) + 1,
      });
    });
  });

  return [...frequencies.values()]
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label),
    )
    .slice(0, 4)
    .map((entry) => entry.label);
}
