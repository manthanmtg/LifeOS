# Whiteboard Module

The Whiteboard module provides a freeform visual thinking space within LifeOS, powered by [Excalidraw](https://excalidraw.com/). It allows users to create sketches, diagrams, and hand-drawn notes with ease.

## Overview

- **Content Type**: `whiteboard_note`
- **Icon**: `PenLine`
- **Purpose**: Brainstorming, architectural sketching, and visual note-taking.

## Data Schema

The module uses the following Zod schema for its `payload`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | The title of the whiteboard. |
| `description` | `string` (optional) | Brief description of the board. |
| `tags` | `string[]` | List of tags for organization. |
| `is_favorite` | `boolean` | Whether the board is marked as a favorite. |
| `color_label` | `enum` | UI label color (`none`, `red`, `blue`, `green`, `yellow`, `purple`, `orange`). |
| `elements` | `any[]` | Excalidraw scene elements. |
| `app_state` | `any` | Excalidraw application state (zoom, scroll, etc.). |
| `files` | `any` | Binary files (images) attached to the whiteboard. |

## Features

### 🎨 Excalidraw Integration
Full access to Excalidraw's drawing tools, including shapes, arrows, text, and freehand drawing. Supports dark mode natively.

### ⚡ Smart Auto-save
The editor automatically saves your progress every 3 seconds as you draw, ensuring no work is lost.

### 🏷️ Organization
- **Tags**: Categorize boards for easy filtering.
- **Favorites**: Star important boards to keep them at the top.
- **Color Labels**: Visually distinguish boards in the list view.

### 🌐 Visibility Control
Toggle between **Private** and **Public** visibility. Public boards can be shared with others (read-only).

### 📊 Dashboard Widget
The dashboard provides a high-level summary:
- Total number of whiteboards.
- Count of favorite and public boards.
- Quick link to the last edited board.
- "Edited today/yesterday" activity indicators.

## Usage

### Creating a New Board
1. Navigate to the **Whiteboard** module from the admin sidebar.
2. Click **New Whiteboard**.
3. Enter a name and optional tags.

### Drawing
- Use the toolbar at the top of the canvas to select tools.
- Elements can be moved, resized, and styled using the properties panel on the left.
- Use the **Save** button for manual persistence, or rely on auto-save.
