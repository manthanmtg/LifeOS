# Bookshelf Module

## Overview
The Bookshelf module tracks your book collection, including reading progress, ratings, and personal notes. It allows you to maintain a queue of books to read, log reading progress, and capture insights and summaries upon completion.

## Data Schema
The `book` content type is defined by `BookSchema` with the following key fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Book title (required) |
| `author` | `string` | Author name (required) |
| `isbn` | `string` | Optional ISBN number |
| `cover_url` | `string` | Optional URL to the book's cover image |
| `status` | `enum` | `"want_to_read"` \| `"reading"` \| `"completed"` \| `"abandoned"` |
| `total_pages`| `number` | Total pages in the book |
| `current_page`| `number` | Current reading progress (default: 0) |
| `rating` | `number` | 1-5 star rating |
| `started_at` | `string` | ISO Date for when reading began |
| `finished_at` | `string` | ISO Date for when reading ended |
| `summary` | `string` | Summary of the book |
| `notes` | `string` | Personal thoughts and reviews |
| `tags` | `string[]`| Optional genre or categorization tags |

## Features
- **Library Management**: Add books with title, author, and cover imagery.
- **Progress Tracking**: Log current page against total pages to visualize progress.
- **Lifecycle Tracking**: Move books through statuses (e.g., to-read, currently reading, finished).
- **Review System**: Rate books and jot down personal notes and summaries after finishing.
- **Organization**: Filter your library by status or custom tags.

## Example Usage

### API Interaction

To add a new book to the bookshelf via the content API:

```json
POST /api/content
{
  "type": "book",
  "payload": {
    "title": "The Pragmatic Programmer",
    "author": "David Thomas, Andrew Hunt",
    "status": "reading",
    "current_page": 45,
    "total_pages": 352,
    "started_at": "2026-05-01T10:00:00.000Z",
    "tags": ["software", "career"]
  }
}
```