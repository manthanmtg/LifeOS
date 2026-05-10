# Slides

Create, preview, and manage presentation decks.

The **Slides** module is designed for uploading, organizing, and presenting slides. It supports multiple presentation formats and provides an embedded full-screen viewer so presentations can be hosted or linked seamlessly within LifeOS.

Admin data is loaded from `/api/content?module_type=deck`, and widget data is loaded from `/api/widgets/summary?module_type=deck`. Public rendering uses the module route with only documents where `is_public` is true.

## Features

- **Multi-Format Support**: Create decks via URL or upload files. Supported formats include HTML, PDF, PowerPoint (`pptx`), Google Slides, and Reveal.js.
- **Embedded Viewer**: Present directly from LifeOS using the full-screen Slide Viewer.
- **Organization**: Categorize your decks with tags, folders, and topics. Assign authors for collaborative or sourced presentations.
- **Visibility Control**: Set deck visibility to `public`, `private`, or `link_only` to control who can view the presentation.
- **Dashboard Widget**: Shows the total number of decks uploaded and highlights the latest deck with its format.
- **Public Grid**: Showcase public decks in an interactive grid with live previews and an easy "Present" action to open the embedded viewer.
- **Smart Previewing**: Prefer `thumbnail_url` when present, otherwise render a scaled iframe preview from `deck_url` or decoded uploaded HTML.
- **Viewer Controls**: Navigate with arrow keys, space, edge clicks, or fullscreen mode while the overlay hides after inactivity.

## Data Schema

The `payload` shape is represented by `DeckItem` in `src/modules/slides/types.ts` and validated by `DeckSchema` in `src/lib/schemas.ts`.

| Field             | Type                                                                       | Description                                        |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| `title`           | `string`                                                                   | Required deck title, trimmed and capped at 200 characters. |
| `description`     | `string` (optional)                                                        | Optional summary, trimmed and capped at 1,000 characters. |
| `format`          | `"html" \| "pdf" \| "pptx" \| "google_slides" \| "reveal_js" \| "url"`       | Presentation format; defaults to `url`.            |
| `visibility`      | `"public" \| "private" \| "link_only"`                                     | Payload-level access label; defaults to `private`. |
| `tags`            | `string[]`                                                                 | Up to 20 trimmed tags, each capped at 50 characters. |
| `author`          | `string` (optional)                                                        | Creator or presenter, capped at 100 characters.    |
| `topic`           | `string` (optional)                                                        | Topic category, capped at 100 characters.          |
| `folder`          | `string` (optional)                                                        | Folder name, capped at 100 characters.             |
| `deck_url`        | `string` (optional)                                                        | URL or uploaded data URL used by previews and the viewer. |
| `file_name`       | `string` (optional)                                                        | Uploaded file name, capped at 255 characters.      |
| `file_size`       | `number` (optional)                                                        | Non-negative uploaded file size in bytes.          |
| `thumbnail_url`   | `string` (optional)                                                        | Cover image URL, capped at 500 characters.         |
| `embed_enabled`   | `boolean`                                                                  | Whether the admin view exposes embed-code copying; defaults to false. |

`visibility` is stored in the module payload, while public API routing depends on the top-level content document `is_public` flag. The admin form keeps them in sync for `public` and `private` states.

## Registration

- **Admin route**: `/admin/slides`
- **Content type**: `deck`
- **Icon**: `Presentation`
- **Default visibility**: private
- **Schema registry key**: `deck`

## Example Usage

Creating a new Slide deck through `/api/content`:

```typescript
const newDeck = {
  module_type: "deck",
  is_public: true,
  payload: {
    title: "Project Architecture 2026",
    description: "An overview of our latest backend architecture and module structure.",
    format: "google_slides",
    visibility: "public",
    tags: ["architecture", "backend", "planning"],
    author: "Jane Doe",
    deck_url: "https://docs.google.com/presentation/d/e/2PACX.../embed",
    embed_enabled: true,
  },
};
```
