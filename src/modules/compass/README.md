# Compass Module

Compass is the private planning board for project navigation, current focus, and directional work. It stores each task as a `compass_task` document in the shared `content` collection and renders a kanban-style admin workspace at `/admin/compass`.

## Registry

| Field             | Value                                         |
| ----------------- | --------------------------------------------- |
| Slug              | `compass`                                     |
| Content type      | `compass_task`                                |
| Icon              | `Map`                                         |
| Public by default | `false`                                       |
| Tags              | `planning`, `focus`, `projects`, `navigation` |

## Data Schema

The payload is validated by `CompassTaskSchema` in `src/lib/schemas.ts`.

| Field           | Type                                                | Notes                                                            |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| `title`         | `string`                                            | Required, trimmed, 1-200 characters.                             |
| `status`        | `"backlog" \| "in_progress" \| "review" \| "done"`  | Defaults to `backlog`.                                           |
| `description`   | `string`                                            | Optional markdown-friendly task details, max 2000 characters.    |
| `comments`      | `{ text, created_at }[]`                            | Task-level activity notes. `created_at` must be an ISO datetime. |
| `checklist`     | `{ id, text, completed, description?, comments }[]` | Subtasks with optional descriptions and nested activity.         |
| `category_tags` | `string[]`                                          | Up to 20 trimmed tags, each 1-50 characters.                     |
| `priority`      | `"p1" \| "p2" \| "p3" \| "p4" \| "p5"`              | Defaults to `p3`.                                                |
| `target_date`   | `string`                                            | Optional ISO datetime.                                           |
| `links`         | `{ label, url }[]`                                  | Reference links with validated URLs.                             |

Example create request:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "compass_task",
    is_public: false,
    payload: {
      title: "Plan Q2 roadmap",
      status: "backlog",
      comments: [],
      checklist: [],
      category_tags: ["roadmap"],
      priority: "p3",
      links: [],
    },
  }),
});
```

## Admin View

`AdminView.tsx` fetches tasks from `/api/content?module_type=compass_task` and renders four kanban columns: Backlog, In Progress, Review, and Done. It supports quick-add, drag-and-drop status updates, drag-to-delete, priority filtering, and Focus Mode, which narrows the board to the In Progress column.

The module uses rich loading placeholders through `KanbanSkeleton` and `SkeletonBlock` while content loads.

## Workspace

Opening a task card launches `WorkspaceModal.tsx`, a split workspace for editing task fields. Changes auto-save back to `/api/content/[id]` with a short debounce. The workspace supports:

- Status and priority changes.
- Markdown-rendered descriptions and comments.
- Tags and validated links.
- Checklist creation, bulk import, reordering, completion toggles, and deletion.
- Subtask detail editing through `components/CompassSubtaskModal.tsx`.

Checklist toggle and status update events are sent through `trackEvent` with the `compass` module name.

## Metrics And Widget

`CompassMetrics.tsx` summarizes the active board with In Progress, Review, Completion, and Attention cards. Attention combines P1 tasks and In Progress tasks that have not been updated for more than seven days.

`Widget.tsx` follows the dashboard widget contract by fetching the compact summary endpoint:

```ts
fetch("/api/widgets/summary?module_type=compass_task");
```

The summary returns `total`, `inProgressCount`, `criticalCount`, and `reviewCount`. The widget shows the In Progress count as the hero metric, then highlights critical path items, review work, or a no-attention-needed state.
