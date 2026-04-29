# Maintenance Module

## Overview

The Maintenance module tracks recurring and one-time upkeep tasks for homes,
vehicles, appliances, subscriptions, and other assets. It is registered in
`src/registry.ts` under the `maintenance` slug with the `maintenance_task`
content type and is private by default.

Admin users manage the module at `/admin/maintenance`. The dashboard widget
loads a compact summary from `/api/widgets/summary?module_type=maintenance_task`
and links to the full admin view through `WidgetCard`.

## Data Schema

Maintenance records are stored in the shared `content` collection with
`module_type: "maintenance_task"`. The payload is validated by
`MaintenanceTaskSchema` in `src/lib/schemas.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `string` | Required task name. |
| `description` | `string` | Optional short description shown in task cards. |
| `category` | enum | `home`, `appliance`, `vehicle`, `electronics`, `plumbing`, `electrical`, `hvac`, `garden`, `cleaning`, `insurance`, `subscription`, or `other`. |
| `service_type` | enum | `self` or `managed`; self-service tasks clear `estimated_cost` before save. |
| `frequency_months` | `number` | Optional positive integer recurrence interval. |
| `last_completed` | `string` | Optional ISO date for the most recent completion. |
| `next_due` | `string` | Optional ISO date; recurring tasks calculate this from `last_completed` and `frequency_months`. |
| `estimated_cost` | `number` | Optional non-negative cost, used for managed service tasks. |
| `currency` | `string` | Three-letter currency code, defaulting to `INR`. |
| `priority` | enum | `high`, `medium`, or `low`. |
| `status` | enum | `upcoming`, `overdue`, `completed`, or `skipped`. |
| `is_recurring` | `boolean` | Defaults to `true`; controls whether completion advances `next_due`. |
| `reminder_enabled` | `boolean` | Stored reminder preference, defaulting to `true`. |
| `history` | array | Completion entries with `id`, `completed_at`, optional `cost`, `notes`, and `vendor`. |
| `tags` | `string[]` | Searchable labels entered as comma-separated text in the admin form. |
| `notes` | `string` | Optional long-form notes. |

## Admin Features

- Create, edit, and delete maintenance tasks through `/api/content`.
- Search by task name, description, or tag.
- Filter by category, priority, and status.
- Sort open work with overdue tasks first, then upcoming tasks by due date.
- Compute display status on load so past `next_due` dates appear overdue.
- Log completions with date, cost, vendor, and notes.
- Seed history when a new task is created with an initial `last_completed` date.
- Show maintenance cycle progress for recurring tasks with both completion and due dates.
- View per-task completion history in a dedicated modal.

## Widget Summary

`src/modules/maintenance/Widget.tsx` follows the dashboard widget contract:

- It fetches only `/api/widgets/summary?module_type=maintenance_task`.
- It renders one hero metric: the number of overdue tasks.
- It shows one highlight row for overdue work, upcoming work, or the total tracked count.
- It has no internal buttons or forms; navigation is handled by `WidgetCard`'s `href`.

The summary API returns:

```ts
interface MaintenanceSummary {
  total: number;
  overdue: number;
  upcoming: number;
  completedThisMonth: number;
}
```

## API Usage

Create a maintenance task:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "maintenance_task",
    is_public: false,
    payload: {
      name: "Replace AC filter",
      category: "hvac",
      service_type: "self",
      frequency_months: 3,
      last_completed: new Date().toISOString(),
      currency: "INR",
      priority: "medium",
      status: "upcoming",
      is_recurring: true,
      reminder_enabled: true,
      history: [],
      tags: ["filter", "seasonal"],
    },
  }),
});
```

Fetch maintenance tasks:

```ts
const response = await fetch("/api/content?module_type=maintenance_task");
const { data } = await response.json();
```

