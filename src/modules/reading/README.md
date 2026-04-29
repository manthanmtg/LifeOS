# Reading Module

The Reading module is a personalized information queue designed to help you manage and track content you want to consume later, such as articles, research papers, videos, and podcasts.

## Overview

In an age of information overload, the Reading module acts as a "buffer" for your intellectual intake. Instead of leaving dozens of tabs open, you can save items to your queue, assign priorities, and categorize them for deep-dive sessions.

## Data Schema

The module uses the `ReadingItemSchema` defined in `src/lib/schemas.ts`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `url` | `string` | Valid URL of the content (Required). |
| `title` | `string` | Descriptive title (1-500 chars, Required). |
| `source_domain` | `string` | Automatically extracted domain (Optional). |
| `priority` | `enum` | `high`, `medium`, `low` (Default: `medium`). |
| `type` | `string` | Content format e.g., article, video, paper (Default: `article`). |
| `is_read` | `boolean` | Completion status (Default: `false`). |
| `read_at` | `datetime` | ISO timestamp of when the item was marked read. |
| `notes` | `string` | Personal takeaways or summaries (Max 5000 chars). |
| `tags` | `string[]` | Array of labels for categorization (Max 20 tags). |

## Features

### Dashboard Widget
The Reading widget provides an at-a-glance view of your queue:
- **Queue Stats**: Total unread items and high-priority count.
- **Up Next**: Highlights the most important unread item.
- **Absorbed Count**: Shows total items completed.

### Queue Management
- **Smart Extraction**: Automatically parses source domains from URLs.
- **Priority System**: Uses visual indicators (Red/Yellow/Green) to distinguish between critical reads and casual browsing.
- **Categorization**: Filter by content type and status to manage your backlog effectively.

## Implementation Details

- **Icon**: `BookOpen`
- **Content Type**: `reading_item`
- **Location**: `src/modules/reading/`

### Components
- `AdminView.tsx`: Full management interface for adding and editing items.
- `PublicView.tsx`: (Internal) Read-only view of the queue.
- `Widget.tsx`: Dashboard summary component.
- `utils.ts`: Contains domain extraction logic and priority styling maps.
