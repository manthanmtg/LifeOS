# Shopping List Module

A dedicated shopping list manager for groceries, household items, and other purchases. It allows you to create lists, parse item quantities smartly, and reuse historical lists.

## Overview

The Shopping List module provides a mobile-friendly interface designed for use in-store. It allows users to manage multiple shopping lists, check off items as they are purchased, and automatically sorts completed items to the bottom of the list.

## Data Schema

The payload structure for a Shopping List (`shopping_list` module type) is strictly validated using Zod (`ShoppingListSchema`):

```typescript
{
  title: string;              // Minimum 1 character, max 200
  items: ShoppingItem[];      // Array of items (see below)
  is_completed: boolean;      // Marks if the whole list is archived/done
  completed_at?: string;      // ISO datetime when completed
  notes?: string;             // Optional additional notes
}
```

**ShoppingItem Schema:**

```typescript
{
  id: string;                 // UUID or unique string identifier
  name: string;               // Item name
  quantity?: string;          // Optional quantity (e.g. "2", "1.5")
  unit?: string;              // Optional unit (e.g. "kg", "ltr", "packs")
  purchased: boolean;         // Checked/unchecked state
}
```

## Features

- **Smart Entry Parsing**: Automatically extracts quantities and units from natural text input.
  - *Quantity First*: "10 eggs" `->` `{ quantity: "10", name: "eggs" }`
  - *Name First*: "Milk 2 ltr" `->` `{ name: "Milk", quantity: "2", unit: "ltr" }`
- **Auto-Suggestions**: Builds suggestion names from items in other unselected lists to quickly populate recurring purchases.
- **List Duplication**: One-click duplication of previous lists for recurring shopping trips.
- **Real-time Partitioning**: Purchased items are immediately separated and moved to the bottom of the list view.
- **Summary Metrics**: Calculates total items, remaining items, purchased items, and a completion percentage.

## Example Usage

### Parsing a Smart Entry

```typescript
import { parseSmartEntry } from "@/modules/shopping-list/helpers";

const itemA = parseSmartEntry("2kg Apples");
// Returns: { name: "Apples", quantity: "2", unit: "kg" }

const itemB = parseSmartEntry("Bananas, 5");
// Returns: { name: "Bananas,", quantity: "5", unit: undefined }
```

### Generating List Summaries

```typescript
import { summarizeList } from "@/modules/shopping-list/helpers";

const listPayload = {
  title: "Weekend Groceries",
  items: [
    { id: "1", name: "Milk", purchased: true },
    { id: "2", name: "Bread", purchased: false }
  ],
  is_completed: false
};

const summary = summarizeList(listPayload);
// Returns: { totalItems: 2, purchasedItems: 1, remainingItems: 1, completionPercent: 50 }
```
