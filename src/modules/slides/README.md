# Slides

Create, preview, and manage presentation decks.

The **Slides** module is designed for uploading, organizing, and presenting slides. It supports multiple presentation formats and provides an embedded full-screen viewer so presentations can be hosted or linked seamlessly within LifeOS.

Admin data is loaded from `/api/content?module_type=deck`, and widget data is loaded from `/api/widgets/summary?module_type=deck`.

## Features

- **Multi-Format Support**: Create decks via URL or upload files. Supported formats include HTML, PDF, PowerPoint (`pptx`), Google Slides, and Reveal.js.
- **Embedded Viewer**: Present directly from LifeOS using the full-screen Slide Viewer.
- **Organization**: Categorize your decks with tags, folders, and topics. Assign authors for collaborative or sourced presentations.
- **Visibility Control**: Set deck visibility to `public`, `private`, or `link_only` to control who can view the presentation.
- **Dashboard Widget**: Shows the total number of decks uploaded and highlights the latest deck with its format.
- **Public Grid**: Showcase public decks in an interactive grid with live previews and an easy "Present" action to open the embedded viewer.

## Data Schema

The `payload` shape is represented by `DeckItem` in `src/modules/slides/types.ts`.

| Field             | Type                                                                       | Description                                        |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| `title`           | `string`                                                                   | The title of the presentation deck.                |
| `description`     | `string` (optional)                                                        | A brief summary of the deck.                       |
| `format`          | `"html" \| "pdf" \| "pptx" \| "google_slides" \| "reveal_js" \| "url"`       | The presentation format.                           |
| `visibility`      | `"public" \| "private" \| "link_only"`                                     | The access control level for the deck.             |
| `tags`            | `string[]`                                                                 | An array of tags for filtering.                    |
| `author`          | `string` (optional)                                                        | The creator or presenter of the deck.              |
| `topic`           | `string` (optional)                                                        | The broader topic category.                        |
| `folder`          | `string` (optional)                                                        | Folder name for organizational grouping.           |
| `deck_url`        | `string` (optional)                                                        | The URL linking to the deck or the embedded source.|
| `file_name`       | `string` (optional)                                                        | Name of the uploaded file, if applicable.          |
| `file_size`       | `number` (optional)                                                        | Size of the uploaded file in bytes.                |
| `thumbnail_url`   | `string` (optional)                                                        | A URL pointing to the deck's cover image.          |
| `embed_enabled`   | `boolean`                                                                  | Whether the deck can be natively embedded/viewed.  |

## Registration

- **Admin route**: `/admin/slides`
- **Content type**: `deck`
- **Icon**: `Presentation`
- **Default visibility**: private

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
