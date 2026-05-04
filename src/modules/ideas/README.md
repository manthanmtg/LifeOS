# Ideas Module

A quick-capture brainstorming board for ideas, shower thoughts, and inspiration. The Ideas module is designed to reduce the friction of capturing concepts while providing a structured Kanban board to review and develop them over time.

## Overview

Whenever an idea strikes, this module allows for immediate capture with a title and optional details. It acts as a staging area where raw ideas can be refined, categorized, and eventually promoted to actionable projects or the public portfolio. The module features a drag-and-drop Kanban interface for easy status management and a review queue that surfaces high-priority concepts.

## Data Schema

The module uses the `IdeaSchema` to structure payload data:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | **Required.** The title of the idea (max 200 chars). |
| `description` | `string` | Optional short description (max 1000 chars). |
| `notes` | `string` | Optional expanded notes or scratchpad (max 5000 chars). |
| `category` | `string` | Optional classification (e.g., "Product", "Personal", "Business"). |
| `status` | `enum` | `"raw"` (default), `"exploring"`, or `"archived"`. |
| `tags` | `string[]` | Array of descriptive tags (max 20 tags). |
| `priority` | `enum` | `"high"`, `"medium"`, or `"low"` (default `"medium"`). |
| `promoted_to_portfolio`| `boolean` | Flag indicating if the idea was promoted to the Portfolio. |
| `promoted_at` | `string` | Optional ISO datetime marking when promotion occurred. |
| `order` | `number` | Optional sorting order for the Kanban board. |

## Features

- **Kanban Board (`dnd.ts`):** Visual drag-and-drop board to manage idea statuses across columns (Raw, Exploring, Archived). Includes collision detection and sorting algorithms via `@dnd-kit`.
- **Review Queue:** Automatically sorts and surfaces high-priority ideas and those lingering in the "raw" state, prompting periodic review.
- **Spotlight & Metrics:** Computes insights such as the most prominent idea, top category, and summary statistics (total, promoted, exploring).
- **Dashboard Widget:** Displays snapshot metrics and alerts when ideas are pending review in the review queue.
- **Public View:** A curated, filterable gallery showing active (non-archived) ideas and their progression.
- **Portfolio Promotion:** Built-in capability to flag an idea as "promoted" once it graduates from an exploration to a concrete project.

## Components

- `AdminView.tsx`: The primary administrative interface, rendering the Kanban board, review queue, and idea filters.
- `PublicView.tsx`: The public-facing gallery for exploring shared ideas.
- `Widget.tsx`: The dashboard summary card tracking idea states and review alerts.
- `IdeaDetailsModal.tsx`: A modal for expanding, reading, and editing an idea's full details and notes.
- `components/IdeaKanban.tsx`: The drag-and-drop droppable zones, sortable items, and drag overlays.

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
