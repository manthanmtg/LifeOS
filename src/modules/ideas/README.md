# Ideas Module

A quick-capture brainstorming board for ideas, shower thoughts, and inspiration. The Ideas module is designed to reduce the friction of capturing concepts while providing a structured Kanban board to review and develop them over time.

## Overview

Whenever an idea strikes, this module allows for immediate capture with a title and optional details. It acts as a staging area where raw ideas can be refined, categorized, and eventually promoted to actionable projects or the public portfolio. The module features a drag-and-drop Kanban interface for status management, per-module settings for capture defaults, and a review queue that keeps active concepts from getting buried.

## Data Schema

The module uses the `IdeaSchema` to structure payload data:

| Field                   | Type       | Description                                                        |
| ----------------------- | ---------- | ------------------------------------------------------------------ |
| `title`                 | `string`   | **Required.** The title of the idea (max 200 chars).               |
| `description`           | `string`   | Optional short description (max 1000 chars).                       |
| `notes`                 | `string`   | Optional expanded notes or scratchpad (max 5000 chars).            |
| `category`              | `string`   | Optional classification (e.g., "Product", "Personal", "Business"). |
| `status`                | `enum`     | `"raw"` (default), `"exploring"`, or `"archived"`.                 |
| `tags`                  | `string[]` | Array of descriptive tags (max 20 tags).                           |
| `priority`              | `enum`     | `"high"`, `"medium"`, or `"low"` (default `"medium"`).             |
| `promoted_to_portfolio` | `boolean`  | Flag indicating if the idea was promoted to the Portfolio.         |
| `promoted_at`           | `string`   | Optional ISO datetime marking when promotion occurred.             |
| `order`                 | `number`   | Optional sorting order for the Kanban board.                       |

The registry maps `/admin/ideas` to `contentType: "idea"`, so admin CRUD calls read and write records through `/api/content?module_type=idea`. Dashboard summaries use `/api/widgets/summary?module_type=idea` and return compact counts instead of loading the full collection into the widget.

## Module Settings

Ideas stores UI preferences through `useModuleSettings("ideasSettings", ...)` in the global `system` config. Current settings are:

| Setting           | Default                                                       | Purpose                                           |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `defaultStatus`   | `"raw"`                                                       | Status applied when a new idea form opens.        |
| `defaultPriority` | `"medium"`                                                    | Priority applied when a new idea form opens.      |
| `categories`      | `["Product", "Personal", "Research", "Business", "Creative"]` | Reusable category chips and datalist suggestions. |

Categories are normalized with `normalizeIdeaCategories`, which trims empty values and deduplicates case-insensitively before saving.

## Features

- **Kanban Board (`dnd.ts`):** Visual drag-and-drop board to manage idea statuses across Raw, Exploring, and Archived columns. Board moves normalize each column's `order` values before persistence.
- **Review Queue:** Surfaces active Raw and Exploring ideas, sorted by priority, status, and recency so the strongest candidates stay visible.
- **Spotlight & Metrics:** Computes the current spotlight, top category, active/archived counts, review count, and promotion metrics in `insights.ts`.
- **Dashboard Widget:** Displays one hero metric plus either review mini-stats or a spotlight row, following the dashboard widget contract.
- **Public View:** Shows only non-archived ideas from public content, with search plus status and category filters.
- **Portfolio Promotion:** Marks an idea as promoted, records `promoted_at`, and moves it to Archived.
- **Undoable Delete:** Admin deletes remove the card optimistically and give a short undo window before the API delete is sent.

## Components

- `AdminView.tsx`: The primary administrative interface, rendering the Kanban board, review queue, and idea filters.
- `PublicView.tsx`: The public-facing gallery for exploring shared ideas.
- `Widget.tsx`: The dashboard summary card tracking idea states and review alerts.
- `IdeaDetailsModal.tsx`: A modal for expanding, reading, and editing an idea's full details and notes.
- `components/IdeaKanban.tsx`: The drag-and-drop droppable zones, sortable items, and drag overlays.
- `components/IdeaSettingsPanel.tsx`: Settings UI for default status, default priority, and reusable categories.
- `insights.ts`: Shared metrics, filtering, spotlight, category, and review queue helpers.
- `dnd.ts`: Shared board status and ordering helpers used by the admin board and tests.

## Usage Example

**Creating a new Idea (Payload structure)**

```json
{
  "title": "Automated Code Review Agent",
  "description": "An AI agent that reviews PRs for accessibility issues.",
  "category": "Product",
  "status": "raw",
  "tags": ["ai", "github", "a11y"],
  "priority": "high"
}
```
