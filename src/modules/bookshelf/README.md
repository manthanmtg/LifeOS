# Bookshelf Module

The Bookshelf module tracks your book collection, reading progress, ratings, and personal notes. It provides a visual library for active, completed, and to-read books.

## Overview

| Property | Value |
| --- | --- |
| Registry slug | `bookshelf` |
| Content type | `book` |
| Icon | `Library` |
| Default visibility | Private (`defaultPublic: false`) |
| Admin route | `/admin/bookshelf` |
| Public route | `/bookshelf` |

## Data Schema

The module payload is validated by `BookSchema` in `src/lib/schemas.ts`.

| Field | Type | Rules |
| --- | --- | --- |
| `title` | `string` | The title of the book. Required. |
| `author` | `string` | The author of the book. Required. |
| `isbn` | `string` | Optional ISBN number. |
| `cover_url` | `string` | Optional URL to the book's cover image. |
| `status` | `enum` | One of `want_to_read`, `reading`, `completed`, or `abandoned`. Defaults to `want_to_read`. |
| `total_pages` | `number` | Optional total pages in the book. |
| `current_page` | `number` | Current reading progress. Defaults to `0`. |
| `rating` | `number` | Optional 1-5 star rating. |
| `started_at` | `string` | Optional ISO Date for when reading began. |
| `finished_at` | `string` | Optional ISO Date for when reading ended. |
| `summary` | `string` | Optional summary of the book. |
| `notes` | `string` | Optional personal thoughts and reviews. |
| `tags` | `string[]` | Optional genre or categorization tags. |

## Features

- **Library Management**: Add books with title, author, and cover imagery.
- **Smart Progress Tracking**: Log current page against total pages to visualize progress.
- **Metrics & Goals**: Admin view calculates reading momentum, completion velocity, average rating, and tracks against a configured `yearlyGoal` via module settings.
- **Lifecycle Tracking**: Move books through statuses (to-read, currently reading, finished).
- **Public View**: A read-only library grouped by status (`reading`, `want_to_read`, `completed`, `abandoned`) and filterable by search query.
- **Dashboard Widget**: Summarizes total books, completed count, and spotlights the currently reading book.

## File Map

| File | Responsibility |
| --- | --- |
| `AdminView.tsx` | Admin list, filters, CRUD helpers, module settings (yearly goal), and metrics sparklines. |
| `Widget.tsx` | Dashboard summary tile displaying total library count and current reading spotlight. |
| `PublicView.tsx` | Public board gallery grouped by status, with search and status filters. |
| `components/types.ts` | Book status types, styles, and bookshelf stats interfaces. |
| `components/BookshelfMetrics.tsx` | Stats display including yearly goal progress and completion rate. |
| `components/BookshelfSettings.tsx` | Admin panel to configure `yearlyGoal` and `defaultStatus`. |

## Example Usage

### Creating a New Book

1. Navigate to the Bookshelf module from the admin sidebar.
2. Click `Add Book`.
3. Enter required fields (`title`, `author`).
4. Update `status` and `total_pages` as necessary.
5. Save the book.

### API Example

```bash
curl -X POST http://localhost:3091/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "module_type": "book",
    "is_public": true,
    "payload": {
      "title": "The Pragmatic Programmer",
      "author": "David Thomas, Andrew Hunt",
      "status": "reading",
      "current_page": 45,
      "total_pages": 352,
      "started_at": "2026-05-01T10:00:00.000Z",
      "tags": ["software", "career"]
    }
  }'
```
