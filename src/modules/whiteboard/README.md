# Whiteboard Module

The Whiteboard module provides a freeform visual thinking space within LifeOS,
powered by [Excalidraw](https://excalidraw.com/). It stores sketches,
diagrams, and hand-drawn notes as `whiteboard_note` documents in the shared
`content` collection.

## Overview

| Property | Value |
| --- | --- |
| Registry slug | `whiteboard` |
| Content type | `whiteboard_note` |
| Icon | `PenLine` |
| Default visibility | Private (`defaultPublic: false`) |
| Admin route | `/admin/whiteboard` |
| Public route | `/whiteboard` for public documents |

## Data Schema

The module payload is validated by `WhiteboardNoteSchema` in
`src/lib/schemas.ts`.

| Field | Type | Rules |
| --- | --- | --- |
| `name` | `string` | The title of the whiteboard. |
| `description` | `string` | Optional, trimmed, max 1000 characters. |
| `tags` | `string[]` | Trimmed tags, max 20 entries, max 50 characters each. |
| `is_favorite` | `boolean` | Defaults to `false`. |
| `color_label` | enum | One of `none`, `red`, `blue`, `green`, `yellow`, `purple`, or `orange`; defaults to `none`. |
| `elements` | `unknown` | Excalidraw scene elements; defaults to an empty array. |
| `app_state` | `unknown` | Persisted Excalidraw view and tool state; defaults to an empty object. |
| `files` | `unknown` | Excalidraw binary file map for embedded images; defaults to an empty object. |

## Features

- **Excalidraw editor**: Admin users get the full dark-mode Excalidraw canvas
  with shapes, arrows, text, freehand drawing, embedded files, and persisted
  view state.
- **Smart autosave**: Canvas changes debounce through a 3-second autosave, and
  the editor still exposes a manual `Save` action for explicit persistence.
- **Organization**: Admin users can search by name, description, or tag; filter
  by tag; filter to favorites; and sort by last edited, newest, name, or
  favorites first.
- **Board actions**: Cards support favorite toggles, public/private visibility,
  duplicate, color labels, rename, and delete confirmation.
- **Read-only public view**: Public boards render in a searchable card grid and
  open in a full-screen Excalidraw viewer with `viewModeEnabled`.
- **Preview generation**: `WhiteboardPreview` exports scene elements to SVG for
  cards, removes script and `foreignObject` nodes, and strips event handler or
  `javascript:` attributes before injecting the preview markup.
- **Dashboard widget**: `Widget.tsx` fetches
  `/api/widgets/summary?module_type=whiteboard_note` and shows the total board
  count plus the latest highlighted board. The summary endpoint prefers a
  favorite board when selecting the highlight, then falls back to most recently
  updated.

## File Map

| File | Responsibility |
| --- | --- |
| `AdminView.tsx` | Admin list, filters, CRUD helpers, editor view, autosave, and tag editing. |
| `Widget.tsx` | Bento Grid summary tile using `WidgetCard`, `WidgetStat`, and `WidgetHighlight`. |
| `PublicView.tsx` | Public board gallery, filters, and read-only Excalidraw overlay. |
| `WhiteboardCard.tsx` | Admin card presentation and card-level actions. |
| `WhiteboardPreview.tsx` | SVG preview export and sanitization for board cards. |
| `types.ts` | Excalidraw type aliases and conversion helpers. |
| `utils.ts` | Color-label metadata, sort option types, document shape, and date helpers. |

## Usage

### Creating a New Board

1. Navigate to the Whiteboard module from the admin sidebar.
2. Click `New Whiteboard`.
3. Enter a required name and optional comma-separated tags.
4. Submit the form. The new board opens directly in the editor.

### Drawing

- Use the Excalidraw toolbar to add shapes, arrows, text, and freehand marks.
- Add or remove tags from the editor header.
- Use `Save` for manual persistence, or rely on autosave while drawing.
- Use the public/private toggle in the editor header or card actions to expose a
  board through the public module route.

### API Example

```bash
curl -X POST http://localhost:3091/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "module_type": "whiteboard_note",
    "is_public": false,
    "payload": {
      "name": "Architecture sketch",
      "description": "Initial service boundary notes",
      "tags": ["architecture", "planning"],
      "is_favorite": false,
      "color_label": "blue",
      "elements": [],
      "app_state": {},
      "files": {}
    }
  }'
```

Authenticated admin requests can create, update, or delete whiteboards through
the shared `/api/content` endpoints. Public reads use the same content
collection but only render documents where `is_public` is `true`.
