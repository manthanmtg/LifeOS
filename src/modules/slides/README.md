# Slides

The Slides module in LifeOS lets you upload or link presentation decks, preview
them in cards, and present them from a full-screen viewer. The module stores
deck metadata in the shared `content` collection with `module_type = "deck"` and
is registered under the `slides` module slug.

## Where it lives

- **Module slug**: `slides`
- **Admin route**: `/admin/slides`
- **Content type**: `deck`
- **Registry key**: `slides`
- **Schema key**: `DeckSchema` in `src/lib/schemas.ts`
- **Payload type**: `DeckItem` in `src/modules/slides/types.ts`
- **Public route**: `/slides` (via `src/app/[module]/page.tsx` + `PublicModuleClient`)

## Module behavior

- Admin list, create, edit, publish/private toggle, and delete are handled by `src/modules/slides/AdminView.tsx`.
- Admin filtering supports search text, format chips, and visibility chips.
- Public cards are rendered by `src/modules/slides/PublicView.tsx`, filtered to `is_public` records, and use the same item contract.
- Dashboard widget reads `/api/widgets/summary?module_type=deck` from `src/modules/slides/Widget.tsx`.
- Supported formats are configured in `FORMATS`:
  - `html`, `pdf`, `pptx`, `google_slides`, `reveal_js`, `url`.
- File uploads are accepted for:
  - `pdf`, `ppt`, `pptx`, `html`, `htm`
  - up to 10 MB each
  - files are converted with `FileReader.readAsDataURL()` and stored in `deck_url`.
- Deck visibility is driven by payload `visibility` and synced with API-level `is_public` when using admin controls. Public route rendering still requires `is_public: true`.

## Features

- **Deck management**: Create, edit, delete, and toggle public/private deck visibility through `/api/content`.
- **Live previews**: `DeckPreview` prefers `thumbnail_url`, falls back to a scaled iframe preview, and shows a presentation icon when no deck URL is available.
- **Presentation viewer**: `SlideViewer` supports arrow-key navigation, spacebar advance, click-side navigation, Escape close/exit fullscreen, and `F` fullscreen toggle.
- **HTML upload handling**: `getIframeSrc()` decodes uploaded HTML data URLs to iframe `srcDoc`, including UTF-8 content.
- **Organization**: Search includes title, description, tags, author, and topic; folder and tag chips are shown on cards.
- **Embedding flag**: `embed_enabled` reveals the admin copy-embed action for deck records that should expose embed markup.
- **Dashboard summary**: The Bento Grid widget shows total decks plus the latest deck title and format.

## Data schema

`DeckSchema` enforces constraints used by `/api/content` writes.

| Field           | Type                                                                   | Notes                                 |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| `title`         | `string`                                                               | Required; max 200 chars.              |
| `description`   | `string \| undefined`                                                  | Optional; max 1,000 chars.            |
| `format`        | `"html" \| "pdf" \| "pptx" \| "google_slides" \| "reveal_js" \| "url"` | Defaults to `url`.                    |
| `visibility`    | `"public" \| "private" \| "link_only"`                                 | Defaults to `private`.                |
| `tags`          | `string[]`                                                             | Up to 20 values, each 1–50 chars.     |
| `author`        | `string \| undefined`                                                  | Optional; max 100 chars.              |
| `topic`         | `string \| undefined`                                                  | Optional; max 100 chars.              |
| `folder`        | `string \| undefined`                                                  | Optional; max 100 chars.              |
| `deck_url`      | `string \| undefined`                                                  | URL or uploaded deck data.            |
| `file_name`     | `string \| undefined`                                                  | Optional; max 255 chars.              |
| `file_size`     | `number \| undefined`                                                  | Optional; non-negative integer bytes. |
| `thumbnail_url` | `string \| undefined`                                                  | Optional; max 500 chars.              |
| `embed_enabled` | `boolean`                                                              | Defaults to `false`.                  |

## Widget summary

`Widget.tsx` consumes the compact dashboard endpoint:

```ts
await fetch("/api/widgets/summary?module_type=deck");
```

Expected response shape:

```ts
interface DeckSummary {
  total: number;
  publicDecks: number;
  uniqueTopics: number;
  latest: {
    payload: {
      title: string;
      format: string;
    };
    created_at: string;
  } | null;
}
```

## API interaction examples

Create a public deck:

```ts
await fetch("/api/content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    module_type: "deck",
    is_public: true,
    payload: {
      title: "Project Architecture",
      description: "Review notes for Q2 roadmap.",
      format: "google_slides",
      visibility: "public",
      tags: ["architecture", "roadmap", "planning"],
      author: "Jane Doe",
      deck_url: "https://docs.google.com/presentation/d/e/.../embed",
      embed_enabled: true,
    },
  }),
});
```

Toggle an existing item to public/private:

```ts
await fetch(`/api/content/${deckId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    is_public: true,
    payload: {
      ...deck.payload,
      visibility: "public",
    },
  }),
});
```

Fetch public slides for `/slides`:

```ts
await fetch("/api/content?module_type=deck&is_public=true");
```

## File map

| File              | Responsibility                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `AdminView.tsx`   | Admin CRUD, filters, upload handling, visibility toggles, and viewer launch.                  |
| `Widget.tsx`      | Dashboard Bento Grid tile using `WidgetCard`, `WidgetStat`, and `WidgetHighlight`.            |
| `PublicView.tsx`  | Public deck grid and full-screen viewer launch for public records.                            |
| `DeckPreview.tsx` | Thumbnail and iframe preview rendering.                                                       |
| `Viewer.tsx`      | Full-screen presentation viewer, keyboard controls, fullscreen state, and progress indicator. |
| `types.ts`        | Deck item type, format labels, visibility labels, and semantic style maps.                    |
| `utils.ts`        | URL/data URL to iframe source conversion helpers.                                             |
