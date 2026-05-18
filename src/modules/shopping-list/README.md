# Shopping List Module

A practical shopping list manager for grocery and household runs with mobile-first list creation, item parsing, quick checkoffs, and completed-item cleanup.

## Overview

The module stores shopping lists in the shared `content` collection with `module_type = "shopping_list"` and is registered as `shopping-list` in `src/registry.ts`.

### Core behavior

- Tabs separate **active** and **completed** lists.
- Items can be added with quick free-text parsing via `parseSmartEntry`.
- Completed items are visually separated in list views.
- A list can be marked complete, duplicated, and deleted from admin screens.

## Data Schema

Payload is validated with `ShoppingListSchema` in `src/lib/schemas.ts`.

`title`

- `string`
- required
- min 1, max 200 characters

`items`

- array of `ShoppingItem` objects
- defaults to `[]`

`ShoppingItem`

- `id` (`string`, required, min 1, max 100)
- `name` (`string`, required, min 1, max 100)
- `quantity` (`string`, optional, max 50)
- `unit` (`string`, optional, max 20)
- `purchased` (`boolean`, defaults to `false`)

`is_completed`

- `boolean`, defaults to `false`

`completed_at`

- `string` ISO date-time, optional

`notes`

- `string`, optional, max 2000

## Admin API contract

- Fetch all lists:
  - `GET /api/content?module_type=shopping_list`
- Create list payload:
  - `POST /api/content`
  - body: `{ module_type, is_public, payload }`
  - `payload` must match `ShoppingListPayload`
- Update list payload:
  - `PUT /api/content/:id`
  - body: `{ payload }`
- Delete list:
  - `DELETE /api/content/:id`

Dashboard widgets call:

- `GET /api/widgets/summary?module_type=shopping_list`

## Feature Notes

- Smart entry parsing supports:
  - quantity-first pattern (`"10 eggs"` -> `{ name: "eggs", quantity: "10" }`)
  - name-first pattern (`"Milk 2 ltr"` -> `{ name: "Milk", quantity: "2", unit: "ltr" }`)
- Duplicate flow strips `completed_at` and resets item `purchased` flags.
- Suggestions are generated from non-selected lists and sorted by frequency.

## Example Usage

### `parseSmartEntry` output

```ts
import { parseSmartEntry } from "@/modules/shopping-list/helpers";

parseSmartEntry("10 eggs");
// { name: "eggs", quantity: "10", unit: undefined }

parseSmartEntry("Milk 2 ltr");
// { name: "Milk", quantity: "2", unit: "ltr" }
```

### `summarizeList` output

```ts
import { summarizeList } from "@/modules/shopping-list/helpers";

const payload = {
  title: "Weekend Groceries",
  items: [
    { id: "1", name: "Milk", purchased: true },
    { id: "2", name: "Bread", purchased: false },
  ],
  is_completed: false,
};

summarizeList(payload);
// { totalItems: 2, purchasedItems: 1, remainingItems: 1, completionPercent: 50 }
```

### Filter lists by tab + search

```ts
import { filterLists } from "@/modules/shopping-list/helpers";

const active = filterLists(lists, "active", "grocer");
const completed = filterLists(lists, "completed", "");
```

## Local Files

- Admin view: `AdminView.tsx`
- Widget summary: `Widget.tsx`
- Helper utilities: `helpers.ts`
- Data types: `types.ts`
