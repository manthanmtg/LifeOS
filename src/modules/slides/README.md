# Slides

Slides in LifeOS let you upload or link deck content and present from a unified interface. The module stores slide metadata in the shared `content` collection with `module_type = "deck"`, renders admin cards with filters, and exposes a full-screen public viewer.

## Where it lives

- **Module slug**: `slides`
- **Admin route**: `/admin/slides`
- **Content type**: `deck`
- **Registry key**: `deck`
- **Schema key**: `DeckSchema` in `src/lib/schemas.ts`
- **Payload type**: `DeckItem` in `src/modules/slides/types.ts`
- **Public route**: `/slides` (via `src/app/[module]/page.tsx` + `PublicModuleClient`)

## Module behavior

- Admin list, create, edit, publish/private toggle, and delete are handled by `src/modules/slides/AdminView.tsx`.
- Public cards are rendered by `src/modules/slides/PublicView.tsx` and use the same item contract.
- Dashboard widget reads `/api/widgets/summary?module_type=deck` from `src/modules/slides/Widget.tsx`.
- Supported formats are configured in `FORMATS`:
  - `html`, `pdf`, `pptx`, `google_slides`, `reveal_js`, `url`.
- File uploads are accepted for:
  - `pdf`, `ppt`, `pptx`, `html`, `htm`
  - up to 10 MB each
  - files are converted to `data:text/html;base64` for `deck_url` in the request payload.
- Deck visibility is driven by payload `visibility` and synced with API-level `is_public` when using admin controls.

## Data schema

`DeckSchema` enforces constraints used by `/api/content` writes.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | Required; max 200 chars. |
| `description` | `string \| undefined` | Optional; max 1,000 chars. |
| `format` | `"html" \| "pdf" \| "pptx" \| "google_slides" \| "reveal_js" \| "url"` | Defaults to `url`. |
| `visibility` | `"public" \| "private" \| "link_only"` | Defaults to `private`. |
| `tags` | `string[]` | Up to 20 values, each 1–50 chars. |
| `author` | `string \| undefined` | Optional; max 100 chars. |
| `topic` | `string \| undefined` | Optional; max 100 chars. |
| `folder` | `string \| undefined` | Optional; max 100 chars. |
| `deck_url` | `string \| undefined` | URL or uploaded deck data. |
| `file_name` | `string \| undefined` | Optional; max 255 chars. |
| `file_size` | `number \| undefined` | Optional; non-negative integer bytes. |
| `thumbnail_url` | `string \| undefined` | Optional; max 500 chars. |
| `embed_enabled` | `boolean` | Defaults to `false`. |

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
