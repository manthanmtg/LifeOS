# Todo Module

Todo is the private quick-capture workspace for short tasks and recurring personal objectives.

## Registry

| Field | Value |
| --- | --- |
| Slug | `todo` |
| Content type | `todo` |
| Module icon | `CheckSquare` |
| Public by default | `false` |
| Tags | `productivity`, `tasks`, `planning` |

## Data Schema

The module payload uses `TodoSchema` from `src/lib/schemas.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | Required, trimmed, 1-200 chars |
| `notes` | `string` | Optional, max 2000 chars |
| `due_date` | ISO datetime string | Optional deadline (`YYYY-MM-DD` input is converted to ISO in UI) |
| `priority` | `"low"  "medium"  "high"` | Optional, defaults to `medium` |
| `completed` | `boolean` | Defaults to `false` |
| `completed_at` | ISO datetime string | Set when marking complete |
| `order` | `number` | Optional ordering hint for client sort/state |

Example create payload:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "todo",
    is_public: false,
    payload: {
      title: "Draft project follow-up notes",
      notes: "Capture decisions from meeting",
      due_date: new Date("2026-05-22").toISOString(),
      priority: "high",
      completed: false,
    },
  }),
});
```

Example update payload:

```ts
await fetch("/api/content/:id", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    payload: {
      title: "Review architecture notes",
      notes: "Prioritized by impact", 
      completed: true,
      completed_at: new Date().toISOString(),
      priority: "medium",
      due_date: undefined,
    },
  }),
});
```

## Admin View (`AdminView.tsx`)

`AdminView` renders the full private objective workflow:

- Header actions (`New Task`) and quick-add flow
- Search and sort (`recent`, `due_date`, `priority`)
- Filter tabs: `Active`, `Today`, `Overdue`, `Critical`, `Done`
- Card/list/grid display modes
- Toggle complete and automatic `completed_at` assignment
- Task delete with confirmation, then delayed hard delete (5s undo window)
- Bulk completion cleanup via `clearCompleted()` action
- Periodic `Focus Score`, `Velocity`, and `Pressure` metrics in header area
- Realtime feedback via toast messages for success/failure states

## Widget (`Widget.tsx`)

The widget follows the dashboard widget contract and fetches compact summary data via:

```ts
GET /api/widgets/summary?module_type=todo
```

Expected response shape:

- `activeCount`
- `doneCount`
- `topActive` (`_id`, `title`)

The tile shows active task count as the hero metric and a rolling list of top active tasks.

## Public View

Todo currently has no `PublicView.tsx`, so it is private/admin-only.
